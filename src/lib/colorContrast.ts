const AA_NORMAL_TEXT = 4.5;
const LIGHT_TEXT = "#ffffff";
const DARK_TEXT = "#020617";
const BLACK_TEXT = "#000000";
const DEFAULT_PRIMARY = "#4f46e5";
const DEFAULT_SECONDARY = "#f8fafc";
const LIGHT_SURFACE = "#f0f0f3";
const DARK_SURFACE = "#020617";

type Rgb = { r: number; g: number; b: number };

const normalizeHex = (value: string | undefined, fallback: string) => {
  const raw = String(value || "").trim().toLowerCase();
  const short = /^#([0-9a-f]{3})$/i.exec(raw);
  if (short) {
    return "#" + short[1].split("").map((char) => char + char).join("");
  }
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw;
  return fallback;
};

const hexToRgb = (hex: string): Rgb => {
  const normalized = normalizeHex(hex, "#000000");
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
};

const channelLuminance = (channel: number) => {
  const value = channel / 255;
  return value <= 0.04045
    ? value / 12.92
    : Math.pow((value + 0.055) / 1.055, 2.4);
};

export const relativeLuminance = (color: string) => {
  const { r, g, b } = hexToRgb(color);
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
};

export const contrastRatio = (foreground: string, background: string) => {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
};

const rgbToHex = ({ r, g, b }: Rgb) =>
  "#" +
  [r, g, b]
    .map((channel) =>
      Math.max(0, Math.min(255, Math.round(channel)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");

export const mixHexColors = (from: string, to: string, amount: number) => {
  const source = hexToRgb(from);
  const target = hexToRgb(to);
  const weight = Math.max(0, Math.min(1, amount));
  return rgbToHex({
    r: source.r + (target.r - source.r) * weight,
    g: source.g + (target.g - source.g) * weight,
    b: source.b + (target.b - source.b) * weight,
  });
};

export const pickReadableTextColor = (
  background: string,
  minimumRatio = AA_NORMAL_TEXT,
) => {
  const normalizedBackground = normalizeHex(background, DEFAULT_PRIMARY);
  const candidates = [LIGHT_TEXT, DARK_TEXT, BLACK_TEXT];
  const passing = candidates.find(
    (candidate) => contrastRatio(candidate, normalizedBackground) >= minimumRatio,
  );
  if (passing) return passing;

  return candidates
    .map((candidate) => ({
      candidate,
      ratio: contrastRatio(candidate, normalizedBackground),
    }))
    .sort((a, b) => b.ratio - a.ratio)[0].candidate;
};

export const ensureTextContrast = (
  foreground: string,
  background: string,
  minimumRatio = AA_NORMAL_TEXT,
) => {
  const normalizedForeground = normalizeHex(foreground, DARK_TEXT);
  const normalizedBackground = normalizeHex(background, LIGHT_SURFACE);
  if (contrastRatio(normalizedForeground, normalizedBackground) >= minimumRatio) {
    return normalizedForeground;
  }

  const target =
    relativeLuminance(normalizedBackground) > 0.45 ? DARK_TEXT : LIGHT_TEXT;

  for (let step = 1; step <= 100; step += 1) {
    const candidate = mixHexColors(
      normalizedForeground,
      target,
      step / 100,
    );
    if (contrastRatio(candidate, normalizedBackground) >= minimumRatio) {
      return candidate;
    }
  }

  return pickReadableTextColor(normalizedBackground, minimumRatio);
};

const resolveBrandSurface = (color: string, fallback: string) => {
  const normalized = normalizeHex(color, fallback);
  const luminance = relativeLuminance(normalized);

  // Visually dark brand fills should read as dark surfaces, even when pure
  // black technically has a higher WCAG ratio on a mid-tone colour. Preserve
  // the hue, darken only as much as necessary, and use white type.
  if (luminance <= 0.32) {
    if (contrastRatio(LIGHT_TEXT, normalized) >= AA_NORMAL_TEXT) {
      return { surface: normalized, foreground: LIGHT_TEXT };
    }

    for (let step = 1; step <= 100; step += 1) {
      const candidate = mixHexColors(normalized, BLACK_TEXT, step / 100);
      if (contrastRatio(LIGHT_TEXT, candidate) >= AA_NORMAL_TEXT) {
        return { surface: candidate, foreground: LIGHT_TEXT };
      }
    }

    return { surface: DARK_SURFACE, foreground: LIGHT_TEXT };
  }

  return {
    surface: normalized,
    foreground: pickReadableTextColor(normalized),
  };
};

export const resolveAccessibleThemeColors = (
  primaryColor?: string,
  secondaryColor?: string,
) => {
  const primary = normalizeHex(primaryColor, DEFAULT_PRIMARY);
  const secondary = normalizeHex(secondaryColor, DEFAULT_SECONDARY);
  const primarySurface = resolveBrandSurface(primary, DEFAULT_PRIMARY);
  const secondarySurface = resolveBrandSurface(secondary, DEFAULT_SECONDARY);

  return {
    primary,
    secondary,
    primarySurface: primarySurface.surface,
    secondarySurface: secondarySurface.surface,
    primaryForeground: primarySurface.foreground,
    secondaryForeground: secondarySurface.foreground,
    primaryInk: ensureTextContrast(primary, LIGHT_SURFACE),
    secondaryInk: ensureTextContrast(secondary, LIGHT_SURFACE),
    primaryOnDark: ensureTextContrast(primary, DARK_SURFACE),
    secondaryOnDark: ensureTextContrast(secondary, DARK_SURFACE),
  };
};

export const WCAG_AA_NORMAL_TEXT_RATIO = AA_NORMAL_TEXT;
export const CONTRAST_TEST_LIGHT_SURFACE = LIGHT_SURFACE;
export const CONTRAST_TEST_DARK_SURFACE = DARK_SURFACE;
