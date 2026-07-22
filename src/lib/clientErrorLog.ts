type ClientErrorLogEntry = {
  id: string;
  level: "error" | "warn" | "info";
  message: string;
  route: string;
  source: string;
  createdAt: string;
  details?: string;
};

const STORAGE_KEY = "bts_client_error_logs";
const MAX_LOGS = 80;

export function readClientErrorLogs(): ClientErrorLogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function clearClientErrorLogs() {
  localStorage.removeItem(STORAGE_KEY);
}

export function logClientError(entry: Omit<ClientErrorLogEntry, "id" | "createdAt" | "route">) {
  try {
    const logs = readClientErrorLogs();
    const next: ClientErrorLogEntry = {
      ...entry,
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      route: window.location.pathname,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([next, ...logs].slice(0, MAX_LOGS)));
  } catch {
    // Logging should never break the app.
  }
}

export type { ClientErrorLogEntry };
