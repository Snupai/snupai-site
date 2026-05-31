/**
 * ASCII background animation variants.
 *
 * Each variant is a pure "field function" that maps a grid cell + time to a
 * density value in roughly [0, 1]. They share the same render harness in
 * `AsciiWave`, so every variant is automatically lightweight (throttled,
 * paused off-screen), loops smoothly, respects prefers-reduced-motion, and
 * never causes layout shift. Pointer interaction is applied uniformly by the
 * harness, so the field functions stay simple and focused on their pattern.
 */

export const ASCII_VARIANTS = [
  { key: "waves", label: "Waves" },
  { key: "ripple", label: "Ripple" },
  { key: "rain", label: "Rain" },
  { key: "plasma", label: "Plasma" },
  { key: "pulse", label: "Pulse" },
] as const;

export type AsciiVariant = (typeof ASCII_VARIANTS)[number]["key"];

export const DEFAULT_VARIANT: AsciiVariant = "waves";

export function isAsciiVariant(value: unknown): value is AsciiVariant {
  return (
    typeof value === "string" &&
    ASCII_VARIANTS.some((variant) => variant.key === value)
  );
}

export interface FieldContext {
  cols: number;
  rows: number;
  time: number;
}

export type FieldFn = (x: number, y: number, ctx: FieldContext) => number;

const fract = (n: number) => n - Math.floor(n);
// Cheap deterministic per-column pseudo-randomness (no allocations).
const rand = (n: number) => fract(Math.sin(n * 127.1) * 43758.5453);

/** Calm, overlapping sine ripples — the original ambient field. */
const waves: FieldFn = (x, y, { cols, rows, time }) => {
  const t = time * 0.0004;
  const cx = cols / 2;
  const cy = rows / 2;
  const nx = (x - cx) * 0.18;
  const ny = (y - cy) * 0.32;
  const dist = Math.sqrt(nx * nx + ny * ny);
  const v =
    Math.sin(nx + t) +
    Math.sin(ny * 0.8 - t * 0.7) +
    Math.sin((nx + ny) * 0.5 + t * 0.5) +
    Math.sin(dist * 1.6 - t * 1.2);
  return (v + 4) / 8;
};

/** Concentric rings radiating from the centre, like a slow sonar sweep. */
const ripple: FieldFn = (x, y, { cols, rows, time }) => {
  const t = time * 0.0012;
  const cx = cols / 2;
  const cy = rows / 2;
  const dx = (x - cx) * 0.5;
  const dy = (y - cy) * 0.9;
  const d = Math.sqrt(dx * dx + dy * dy);
  const v = Math.sin(d * 0.55 - t * 3) * Math.exp(-d * 0.02);
  return (v + 1) / 2;
};

/** Soft matrix-style rain: per-column drops falling at varied speeds. */
const rain: FieldFn = (x, y, { rows, time }) => {
  const t = time * 0.004;
  const seed = rand(x + 1);
  const speed = 3 + seed * 7;
  const span = rows + 12;
  const head = (t * speed + seed * span) % span;
  const rel = head - y; // > 0 => cell is in the trailing tail above the head
  if (rel < -1) return 0;
  if (rel < 0) return 0.95; // bright leading head
  return Math.max(0, 0.85 - rel * 0.12); // fading tail
};

/** Classic plasma: blended sines across position and radius. */
const plasma: FieldFn = (x, y, { time }) => {
  const t = time * 0.0006;
  const v =
    Math.sin(x * 0.22 + t) +
    Math.sin(y * 0.33 - t * 1.1) +
    Math.sin((x + y) * 0.16 + t * 0.7) +
    Math.sin(Math.sqrt(x * x + y * y) * 0.12 - t * 1.3);
  return (v + 4) / 8;
};

/** Pulsing dot grid: sparse dots brightening in a wave from the centre. */
const pulse: FieldFn = (x, y, { cols, rows, time }) => {
  if (x % 4 !== 0 || y % 2 !== 0) return 0;
  const t = time * 0.0015;
  const cx = cols / 2;
  const cy = rows / 2;
  const d = Math.sqrt((x - cx) * (x - cx) * 0.25 + (y - cy) * (y - cy));
  return Math.sin(d * 0.3 - t * 3) * 0.5 + 0.5;
};

export const FIELD_FNS: Record<AsciiVariant, FieldFn> = {
  waves,
  ripple,
  rain,
  plasma,
  pulse,
};
