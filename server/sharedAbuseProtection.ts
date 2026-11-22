import { createHash, createHmac } from "node:crypto";
import { isIP } from "node:net";

/**
 * Server-side shared abuse control. Counters are isolated per operation and
 * use opaque identities, never raw email addresses or IPs in Redis key names.
 *
 * The Lua operation atomically checks, increments, and sets the TTL. Once a
 * quota is exceeded, requests remain blocked without extending the window.
 */
export const ATOMIC_RATE_LIMIT_LUA = [
  "local quota = tonumber(ARGV[1])",
  "local window = tonumber(ARGV[2])",
  "local current = tonumber(redis.call('GET', KEYS[1]) or '0')",
  "local ttl = redis.call('PTTL', KEYS[1])",
  "if current == 0 then",
  "  redis.call('SET', KEYS[1], 1, 'PX', window)",
  "  return {1, 1, window}",
  "end",
  "if ttl < 1 then",
  "  redis.call('PEXPIRE', KEYS[1], window)",
  "  ttl = window",
  "end",
  "if current >= quota then",
  "  return {0, current, ttl}",
  "end",
  "local next = redis.call('INCR', KEYS[1])",
  "return {1, next, ttl}",
].join("\n");

export interface AtomicRedisClient {
  eval(script: string, keys: string[], args: (string | number)[]): Promise<unknown>;
}

export interface RateLimitInput {
  keyPrefix: string;
  identity: string;
  windowMs: number;
  max: number;
  /** A failed shared store must not allow expensive or write-heavy actions. */
  sensitive?: boolean;
}

export type RateLimitResult =
  | { status: "allowed" | "limited"; source: "shared" | "memory"; remaining: number; retryAfterMs: number }
  | { status: "unavailable"; source: "unavailable"; remaining: 0; retryAfterMs: number };

export interface AbuseProtectionOptions {
  redis?: AtomicRedisClient | null;
  requireShared?: boolean;
  hashSecret?: string;
  now?: () => number;
  warn?: (message: string, context: Record<string, string>) => void;
}

type MemoryBucket = { count: number; resetAt: number };

export const isSensitiveRateLimit = (prefix: string): boolean =>
  /^(?:newsletter-|platform-leads-|preview-intake-|preview-checkout|public-plan-checkout|public-funnel-(?:submit|checkout)|call-bookings|website-audit|seo-audit|public-leads|portfolio-leads|public-proposal-accept)/.test(prefix);

const readHeader = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return "";
};

const normalizeIp = (raw: unknown): string | null => {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (value.startsWith("::ffff:") && isIP(value.slice(7)) === 4) {
    return value.slice(7);
  }
  return isIP(value) ? value : null;
};

/**
 * Vercel replaces X-Forwarded-For, so the first address is trusted there.
 * On direct/non-Vercel Express servers, ignore untrusted client-provided
 * forwarding headers and prefer the actual peer socket address.
 */
export function getRateLimitClientIp(
  request: {
    headers?: Record<string, unknown>;
    socket?: { remoteAddress?: string };
    ip?: string;
  },
  onVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV),
): string {
  if (onVercel) {
    const forwarded = readHeader(request.headers?.["x-forwarded-for"]).split(",")[0];
    const verified = normalizeIp(forwarded);
    if (verified) return verified;
  }
  return normalizeIp(request.socket?.remoteAddress)
    || normalizeIp(request.ip)
    || "unidentified";
}

export class SharedAbuseProtection {
  private readonly redis: AtomicRedisClient | null;
  private readonly requireShared: boolean;
  private readonly secret: string;
  private readonly clock: () => number;
  private readonly warn?: AbuseProtectionOptions["warn"];
  private readonly memory = new Map<string, MemoryBucket>();
  private readonly warningTimes = new Map<string, number>();

  constructor(options: AbuseProtectionOptions = {}) {
    this.redis = options.redis || null;
    this.requireShared = options.requireShared === true;
    this.secret = options.hashSecret || "";
    this.clock = options.now || Date.now;
    this.warn = options.warn;
  }

  get sharedConfigured(): boolean {
    return this.redis !== null;
  }

  get strictRequired(): boolean {
    return this.requireShared;
  }

  private opaqueKey(input: RateLimitInput): string {
    const hash = this.secret
      ? createHmac("sha256", this.secret).update(input.identity.trim().toLowerCase()).digest("hex")
      : createHash("sha256").update(input.identity.trim().toLowerCase()).digest("hex");
    const namespace = input.keyPrefix.replace(/[^a-zA-Z0-9:_-]/g, "_").slice(0, 80);
    return "bs:rate:v2:" + namespace + ":" + hash;
  }

  private emitWarning(message: string, prefix: string): void {
    if (!this.warn) return;
    const now = this.clock();
    const key = message + ":" + prefix;
    if (now - (this.warningTimes.get(key) ?? Number.NEGATIVE_INFINITY) < 60_000) return;
    this.warningTimes.set(key, now);
    this.warn(message, { scope: prefix, mode: this.requireShared ? "required" : "optional" });
    if (this.warningTimes.size > 500) this.warningTimes.clear();
  }

  private memoryConsume(key: string, input: RateLimitInput): RateLimitResult {
    const now = this.clock();
    let bucket = this.memory.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + input.windowMs };
      this.memory.set(key, bucket);
    }
    if (bucket.count >= input.max) {
      return { status: "limited", source: "memory", remaining: 0, retryAfterMs: Math.max(1, bucket.resetAt - now) };
    }
    bucket.count++;
    // Avoid an unbounded fallback map if an attacker supplies many identities.
    if (this.memory.size > 20_000) {
      for (const [bucketKey, value] of this.memory) {
        if (value.resetAt <= now) this.memory.delete(bucketKey);
      }
      if (this.memory.size > 20_000) this.memory.clear();
    }
    return { status: "allowed", source: "memory", remaining: Math.max(0, input.max - bucket.count), retryAfterMs: Math.max(1, bucket.resetAt - now) };
  }

  async consume(input: RateLimitInput): Promise<RateLimitResult> {
    if (!Number.isSafeInteger(input.max) || input.max < 1 || !Number.isSafeInteger(input.windowMs) || input.windowMs < 1000) {
      throw new Error("Invalid abuse protection quota");
    }
    const key = this.opaqueKey(input);
    if (this.redis) {
      try {
        const reply = await this.redis.eval(ATOMIC_RATE_LIMIT_LUA, [key], [String(input.max), String(input.windowMs)]);
        if (!Array.isArray(reply) || reply.length !== 3) throw new Error("Invalid Redis rate limit response");
        const [allowed, count, ttl] = reply.map(Number);
        if (![allowed, count, ttl].every(Number.isFinite) || (allowed !== 0 && allowed !== 1) || count < 0) {
          throw new Error("Invalid Redis rate limit counter");
        }
        return {
          status: allowed === 1 ? "allowed" : "limited",
          source: "shared",
          remaining: Math.max(0, input.max - count),
          retryAfterMs: Math.max(1, ttl),
        };
      } catch {
        this.emitWarning("redis_abuse_counter_unavailable", input.keyPrefix);
        if (input.sensitive) {
          return { status: "unavailable", source: "unavailable", remaining: 0, retryAfterMs: 30_000 };
        }
      }
    } else if (this.requireShared && input.sensitive) {
      this.emitWarning("required_redis_abuse_counter_missing", input.keyPrefix);
      return { status: "unavailable", source: "unavailable", remaining: 0, retryAfterMs: 30_000 };
    } else {
      this.emitWarning("redis_abuse_counter_not_configured", input.keyPrefix);
    }
    return this.memoryConsume(key, input);
  }
}
