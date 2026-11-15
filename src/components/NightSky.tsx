'use client';

import { useEffect, useRef } from 'react';

/** Size of one "art pixel" in CSS px. */
const PX = 3;

/**
 * Height of the fixed footer (`h-12`) in CSS px. The canvas covers the whole
 * viewport and the river runs on underneath the footer, so it fades out
 * behind the footer's blur instead of stopping at a hard edge.
 */
const FOOTER_PX = 48;

type RGB = readonly [number, number, number];

/** Sky gradient stops, top → horizon. Drawn as flat bands, no dithering. */
const SKY_TOP: RGB = [9, 10, 24];
const SKY_HORIZON: RGB = [33, 34, 66];
const SKY_BANDS = 14;

const STAR_TINTS: readonly RGB[] = [
  [214, 222, 255],
  [236, 236, 246],
  [255, 236, 206],
];

const MOON_LIT: RGB = [238, 234, 214];
const MOON_SHADE: RGB = [206, 202, 186];
const MOON_CRATER: RGB = [184, 180, 168];
/** The unlit side, faintly visible by earthshine. */
const MOON_DARK: RGB = [40, 44, 74];
const HALO: RGB = [190, 200, 255];

/** Aurora colour ramp, from the bright lower edge up into the fading top. */
const AURORA_LOW: RGB = [96, 255, 168];
const AURORA_MID: RGB = [64, 214, 210];
const AURORA_HIGH: RGB = [156, 112, 245];
/** Peak aurora alpha, and the number of stepped alpha levels below it. */
const AURORA_ALPHA = 0.2;
const AURORA_LEVELS = 10;

const BANK: RGB = [11, 14, 22];
const BANK_RIM: RGB = [28, 33, 52];
const REED: RGB = [16, 21, 28];
/** The near bank is a darker foreground silhouette than the far one. */
const NEAR_BANK: RGB = [10, 13, 22];
const NEAR_RIM: RGB = [26, 32, 52];
const CATTAIL: RGB = [34, 26, 24];

const WATER: RGB = [12, 17, 36];
const SHIMMER: RGB = [92, 116, 176];
const GLINT: RGB = [168, 188, 236];
const MOON_GLITTER: RGB = [232, 228, 204];

const FIREFLY: RGB = [226, 255, 120];
const FIREFLY_GLOW: RGB = [170, 220, 80];

const SHOOTING_HEAD: RGB = [255, 255, 255];
const SHOOTING_TAIL: RGB = [180, 200, 255];

/** Mean synodic month, and a reference new moon (2000-01-06 18:14 UTC). */
const SYNODIC_DAYS = 29.530588853;
const NEW_MOON_REF = Date.UTC(2000, 0, 6, 18, 14);

/** Craters on the unit disc: [x, y, radius]. */
const CRATERS = [
  [-0.38, -0.3, 0.2],
  [0.28, 0.22, 0.24],
  [0.12, -0.52, 0.13],
  [-0.22, 0.48, 0.15],
  [0.52, -0.18, 0.11],
  [-0.55, 0.12, 0.1],
] as const;

/** Moon age as a fraction of the synodic month: 0 = new, 0.5 = full. */
export const moonPhase = (time: number) => {
  const days = (time - NEW_MOON_REF) / 86400000;
  const p = (days % SYNODIC_DAYS) / SYNODIC_DAYS;
  return p < 0 ? p + 1 : p;
};

interface Star {
  x: number;
  y: number;
  /** 0 = faint, 1 = medium, 2 = bright with a cross glint. */
  kind: 0 | 1 | 2;
  alpha: number;
  tint: RGB;
  speed: number;
  phase: number;
  amp: number;
}

interface ShootingStar {
  x: number;
  y: number;
  /** Unit direction of travel. */
  dx: number;
  dy: number;
  speed: number;
  len: number;
  age: number;
  life: number;
}

interface Firefly {
  x: number;
  /** Row of the ground or water under the firefly. */
  ground: number;
  /** Height above that ground, in art pixels. */
  lift: number;
  vx: number;
  vl: number;
  /** Pulse period in ms, and offset. */
  period: number;
  phase: number;
  /** Wander direction phase. */
  wander: number;
}

interface Reed {
  x: number;
  base: number;
  height: number;
  lean: number;
  head: boolean;
  phase: number;
}

interface NightSkyProps {
  className?: string;
  /** Whether occasional shooting stars streak across the sky. */
  shootingStars?: boolean;
}

/**
 * A pixel-art night by a river.
 *
 * Draws into an ImageData buffer at low resolution and scales it up with
 * nearest-neighbour sampling. A banded deep-blue sky holds layered, gently
 * twinkling stars (the brightest with a small cross glint), slow aurora
 * curtains rendered as stepped alpha levels, and a moon in its actual current
 * phase with a soft halo. Now and then a shooting star streaks past. Along the
 * bottom a river reflects the bank, the lower sky, a broken column of
 * moonlight and a hint of aurora, with fireflies drifting over it and reeds
 * swaying at the edges. Its waterline sits just above the footer and the
 * water runs on behind the footer's blur, so there is no hard cut.
 *
 * The static parts (sky, moon, far bank) are drawn once into a cached layer
 * that each frame starts from. Capped at ~60fps with an even cadence, pauses
 * when hidden, and respects prefers-reduced-motion with a single still frame
 * (no shooting stars).
 */
export default function NightSky({ className, shootingStars = true }: NightSkyProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    // Canvas size in art pixels, and the waterline row.
    let w = 0;
    let h = 0;
    let horizon = 0;
    // Per column: the waterline (far shore) and the first row of the near
    // bank (h where there is none and the water runs on behind the footer).
    let wl = new Int16Array(0);
    let near = new Int16Array(0);
    let riverH = 0;
    // Per-row river phases, refilled each frame.
    let rowShift = new Int16Array(0);
    let rowWob = new Float32Array(0);
    let rowS1 = new Float32Array(0);
    let rowS2 = new Float32Array(0);
    let rowS3 = new Float32Array(0);
    let rowMix = new Float32Array(0);
    // A fresh river course per page load, kept across resizes.
    const seed = Math.floor(Math.random() * 10000);
    let image: ImageData | null = null;
    let buf = new Uint8ClampedArray(0);
    let staticBuf = new Uint8ClampedArray(0);

    let stars: Star[] = [];
    let fireflies: Firefly[] = [];
    let reeds: Reed[] = [];
    let shooting: ShootingStar | null = null;
    // Aurora brightness per column, for tinting the river.
    let auroraCol = new Float32Array(0);

    let moonX = 0;
    let moonY = 0;
    let moonR = 0;
    let phase = moonPhase(Date.now());
    /** Lit fraction of the disc, 0..1. */
    let illum = 0;
    let nextPhaseCheck = 600000;

    let elapsed = Math.random() * 600000;
    let nextShooting = rand(5000, 15000);

    function rand(min: number, max: number) {
      return min + Math.random() * (max - min);
    }

    /** Stable pseudo-random 0..1 per integer lattice point. */
    const hash = (x: number, y: number) => {
      let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
      n = Math.imul(n ^ (n >>> 13), 1274126177);
      return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    };

    /** Smooth 1D value noise, 0..1. */
    const noise = (x: number, seed: number) => {
      const ix = Math.floor(x);
      const f = x - ix;
      const u = f * f * (3 - 2 * f);
      const a = hash(ix, seed);
      return a + (hash(ix + 1, seed) - a) * u;
    };

    /** Table-based sine; plenty precise for pixel art, and much cheaper. */
    const SIN_N = 4096;
    const SIN = new Float32Array(SIN_N);
    for (let n = 0; n < SIN_N; n++) SIN[n] = Math.sin((n / SIN_N) * Math.PI * 2);
    const SIN_K = SIN_N / (Math.PI * 2);
    const sinL = (v: number) => SIN[(v * SIN_K) & (SIN_N - 1)]!;

    const smooth = (e0: number, e1: number, v: number) => {
      const p = Math.min(1, Math.max(0, (v - e0) / (e1 - e0)));
      return p * p * (3 - 2 * p);
    };

    // --- pixel buffer helpers -------------------------------------------
    // The buffer is fully opaque, so blending is a plain lerp.

    const blendAt = (b: Uint8ClampedArray, i: number, c: RGB, a: number) => {
      const r = b[i]!;
      const g = b[i + 1]!;
      const bl = b[i + 2]!;
      b[i] = r + (c[0] - r) * a;
      b[i + 1] = g + (c[1] - g) * a;
      b[i + 2] = bl + (c[2] - bl) * a;
    };

    const plot = (x: number, y: number, c: RGB, a: number) => {
      if (x < 0 || y < 0 || x >= w || y >= h || a <= 0) return;
      blendAt(buf, (y * w + x) * 4, c, Math.min(1, a));
    };

    // --- static layer: sky, moon, far bank -------------------------------

    const buildStatic = () => {
      const b = staticBuf;
      const sky = (y: number): RGB => {
        // Flat bands, slightly denser toward the horizon glow.
        const p = Math.floor(((y / horizon) ** 1.6) * SKY_BANDS) / SKY_BANDS;
        return [
          SKY_TOP[0] + (SKY_HORIZON[0] - SKY_TOP[0]) * p,
          SKY_TOP[1] + (SKY_HORIZON[1] - SKY_TOP[1]) * p,
          SKY_TOP[2] + (SKY_HORIZON[2] - SKY_TOP[2]) * p,
        ];
      };
      for (let y = 0; y < h; y++) {
        const c = sky(Math.min(y, horizon));
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          b[i] = c[0];
          b[i + 1] = c[1];
          b[i + 2] = c[2];
          b[i + 3] = 255;
        }
      }

      // Moon halo: a few flat rings whose strength follows the lit fraction.
      const haloR = moonR * 3.2;
      const glow = 0.15 + 0.85 * illum;
      for (let y = Math.floor(moonY - haloR); y <= moonY + haloR; y++) {
        for (let x = Math.floor(moonX - haloR); x <= moonX + haloR; x++) {
          if (x < 0 || y < 0 || x >= w || y >= horizon) continue;
          const d = Math.hypot(x - moonX, y - moonY);
          if (d <= moonR || d > haloR) continue;
          const t = (d - moonR) / (haloR - moonR);
          const step = t < 0.18 ? 0.16 : t < 0.42 ? 0.1 : t < 0.7 ? 0.055 : 0.025;
          blendAt(b, (y * w + x) * 4, HALO, step * glow);
        }
      }

      // Moon disc. The terminator is the ellipse x = cos(2π·phase)·√(1-y²):
      // waxing lights the right side, waning the left (northern hemisphere).
      const k = Math.cos(phase * Math.PI * 2);
      const waxing = phase < 0.5;
      for (let y = -moonR; y <= moonR; y++) {
        for (let x = -moonR; x <= moonR; x++) {
          const nx = (x + 0.5) / (moonR + 0.5);
          const ny = (y + 0.5) / (moonR + 0.5);
          if (nx * nx + ny * ny > 1) continue;
          const px = Math.round(moonX + x);
          const py = Math.round(moonY + y);
          if (px < 0 || py < 0 || px >= w || py >= h) continue;
          const edge = k * Math.sqrt(1 - ny * ny);
          // Signed distance into the lit side, in art pixels.
          const lit = (waxing ? nx - edge : -edge - nx) * moonR;
          let c: RGB = MOON_DARK;
          if (lit > 0.6) {
            c = MOON_LIT;
            for (const [cx, cy, cr] of CRATERS) {
              const dx = nx - cx;
              const dy = ny - cy;
              if (dx * dx + dy * dy < cr * cr) c = MOON_CRATER;
            }
            // A darker limb gives the disc a little roundness.
            if (c === MOON_LIT && nx * nx + ny * ny > 0.78) c = MOON_SHADE;
          } else if (lit > -0.4) {
            c = MOON_SHADE;
            if (lit < 0.1) c = [120, 120, 130];
          }
          const i = (py * w + px) * 4;
          b[i] = c[0];
          b[i + 1] = c[1];
          b[i + 2] = c[2];
        }
      }

      // Far bank: a low rolling silhouette with grass blades and the odd reed.
      for (let x = 0; x < w; x++) {
        const rise = Math.round(
          1 +
            riverH * 0.22 * noise(x / 120, seed + 70) +
            2.2 * noise(x / 26, seed + 71) +
            1.4 * noise(x / 9, seed + 72),
        );
        const top = wl[x]! - rise;
        for (let y = top; y < wl[x]!; y++) {
          const i = (y * w + x) * 4;
          const c = y === top ? BANK_RIM : BANK;
          b[i] = c[0];
          b[i + 1] = c[1];
          b[i + 2] = c[2];
        }
        const r = hash(x, seed + 73);
        let blade = 0;
        if (r < 0.04) blade = 6 + Math.floor(hash(x, seed + 74) * 6);
        else if (r < 0.45) blade = 1 + Math.floor(hash(x, seed + 75) * 3);
        for (let j = 1; j <= blade; j++) {
          const y = top - j;
          if (y < 0) break;
          const i = (y * w + x) * 4;
          const c = blade > 4 && j > blade - 2 ? CATTAIL : BANK;
          b[i] = c[0];
          b[i + 1] = c[1];
          b[i + 2] = c[2];
        }
      }
    };

    const updateMoon = () => {
      phase = moonPhase(Date.now());
      illum = (1 - Math.cos(phase * Math.PI * 2)) / 2;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, Math.ceil(rect.width / PX));
      h = Math.max(1, Math.ceil(rect.height / PX));
      canvas.width = w;
      canvas.height = h;
      image = ctx.createImageData(w, h);
      buf = image.data;
      staticBuf = new Uint8ClampedArray(buf.length);
      auroraCol = new Float32Array(w);

      // Visible water above the footer, plus the rows hidden behind it.
      const footer = Math.ceil(FOOTER_PX / PX);
      riverH = Math.max(12, Math.min(36, Math.round((h - footer) * 0.12)));
      horizon = Math.max(1, h - footer - riverH);
      const shore = h - footer;

      // The far shore winds back and forth, and grassy points of the near
      // bank jut into the water here and there, so the river meanders
      // instead of running as one straight band.
      wl = new Int16Array(w);
      near = new Int16Array(w);
      const bend = riverH * 0.45;
      for (let x = 0; x < w; x++) {
        const n = 0.7 * noise(x / 150, seed + 61) + 0.3 * noise(x / 55, seed + 62);
        wl[x] = horizon + Math.round(n * bend);
        const p = smooth(0.6, 0.88, 0.75 * noise(x / 110, seed + 81) + 0.25 * noise(x / 35, seed + 82));
        // The slope starts down behind the footer, so a point rises gently out
        // of it instead of starting with a wall at the footer's edge.
        const lift = Math.round(p * (riverH * 0.5 + footer) + 1.5 * noise(x / 6, seed + 83)) - footer;
        near[x] = p > 0 && shore - lift < h ? Math.max(wl[x]! + 4, shore - lift) : h;
      }
      const rows = h - horizon;
      rowShift = new Int16Array(rows);
      rowWob = new Float32Array(rows);
      rowS1 = new Float32Array(rows);
      rowS2 = new Float32Array(rows);
      rowS3 = new Float32Array(rows);
      rowMix = new Float32Array(rows);

      moonR = Math.max(5, Math.min(11, Math.round(Math.min(w, h) * 0.032)));
      moonX = Math.round(w > 320 ? w * 0.8 : w * 0.72);
      moonY = Math.round(Math.max(moonR * 2.5, horizon * 0.2));

      updateMoon();
      buildStatic();

      // Stars thin out toward the horizon and keep clear of the moon.
      const starBottom = horizon - 12;
      const count = Math.round((w * Math.max(0, starBottom)) / 200);
      stars = [];
      let bright = 0;
      for (let n = 0; n < count; n++) {
        const x = Math.floor(Math.random() * w);
        const y = Math.floor(starBottom * Math.random() ** 1.25);
        if (Math.hypot(x - moonX, y - moonY) < moonR * 3.4) continue;
        const r = Math.random();
        const kind: 0 | 1 | 2 = r < 0.035 && bright < 14 ? 2 : r < 0.3 ? 1 : 0;
        if (kind === 2) bright++;
        const fade = 0.35 + 0.65 * Math.min(1, (starBottom - y) / (starBottom * 0.35));
        stars.push({
          x,
          y,
          kind,
          alpha: fade * (kind === 2 ? rand(0.85, 1) : kind === 1 ? rand(0.5, 0.8) : rand(0.2, 0.45)),
          tint: STAR_TINTS[Math.floor(Math.random() * STAR_TINTS.length)]!,
          speed: rand(0.0007, 0.0026),
          phase: rand(0, Math.PI * 2),
          amp: kind === 2 ? 0.25 : rand(0.25, 0.5),
        });
      }

      // A handful of fireflies over the near bank and the water.
      const flies = Math.max(5, Math.min(14, Math.round(w / 55)));
      fireflies = [];
      for (let n = 0; n < flies; n++) {
        const x = rand(0, w);
        const c = Math.min(w - 1, Math.floor(x));
        fireflies.push({
          x,
          ground: Math.round(rand(wl[c]! - 4, Math.min(near[c]!, shore) - 2)),
          lift: rand(3, 14),
          vx: 0,
          vl: 0,
          period: rand(2400, 5200),
          phase: rand(0, 1),
          wander: rand(0, 1000),
        });
      }

      // Reeds grow along the near banks, densest at the water's edge.
      reeds = [];
      for (let x = 1; x < w - 1; x++) {
        if (near[x]! >= h) continue;
        const atEdge = near[x - 1]! >= h || near[x + 1]! >= h;
        if (hash(x, seed + 90) > (atEdge ? 0.7 : 0.1)) continue;
        const tall = Math.random();
        reeds.push({
          x,
          base: near[x]! + 1,
          height: Math.round(riverH * (0.25 + 0.4 * tall) + rand(0, 3)),
          lean: rand(-0.12, 0.12),
          head: tall > 0.55,
          phase: rand(0, Math.PI * 2),
        });
      }
    };

    // --- simulation -----------------------------------------------------

    const spawnShooting = (): ShootingStar => {
      const dir = Math.random() < 0.5 ? -1 : 1;
      const angle = rand(0.25, 0.6);
      return {
        x: dir > 0 ? rand(0.05, 0.6) * w : rand(0.4, 0.95) * w,
        y: rand(0.04, 0.35) * horizon,
        dx: Math.cos(angle) * dir,
        dy: Math.sin(angle),
        speed: rand(0.22, 0.34),
        len: Math.round(rand(14, 26)),
        age: 0,
        life: rand(650, 1100),
      };
    };

    let lastTime = 0;

    const step = (time: number) => {
      const dt = lastTime ? Math.min(64, time - lastTime) : 16;
      lastTime = time;
      elapsed += dt;

      if ((nextPhaseCheck -= dt) <= 0) {
        nextPhaseCheck = 600000;
        updateMoon();
        buildStatic();
      }

      if (shooting) {
        shooting.age += dt;
        shooting.x += shooting.dx * shooting.speed * dt;
        shooting.y += shooting.dy * shooting.speed * dt;
        if (shooting.age > shooting.life) {
          shooting = null;
          nextShooting = rand(14000, 45000);
        }
      } else if (shootingStars && (nextShooting -= dt) <= 0) {
        shooting = spawnShooting();
      }

      // Fireflies wander lazily: smooth, slowly changing headings.
      for (const f of fireflies) {
        f.wander += dt * 0.00035;
        const ax = (noise(f.wander, 11) - 0.5) * 0.004;
        const al = (noise(f.wander + 50, 12) - 0.5) * 0.003;
        f.vx = (f.vx + ax * dt) * 0.985 ** (dt / 16);
        f.vl = (f.vl + al * dt) * 0.985 ** (dt / 16);
        f.vx = Math.max(-0.012, Math.min(0.012, f.vx));
        f.vl = Math.max(-0.006, Math.min(0.006, f.vl));
        f.x += f.vx * dt;
        f.lift += f.vl * dt;
        if (f.lift < 2) f.vl = Math.abs(f.vl);
        if (f.lift > 16) f.vl = -Math.abs(f.vl);
        f.lift = Math.max(2, Math.min(16, f.lift));
        if (f.x < -4) f.x = w + 3;
        if (f.x > w + 4) f.x = -3;
      }
    };

    // --- drawing --------------------------------------------------------

    const drawStars = (t: number) => {
      for (const s of stars) {
        const tw = 1 - s.amp * (0.5 + 0.5 * sinL(t * s.speed + s.phase));
        const a = s.alpha * tw;
        plot(s.x, s.y, s.tint, a);
        if (s.kind === 2) {
          // Small cross glint, stepped: arms at half, tips only near the peak.
          const arm = a * 0.45;
          plot(s.x - 1, s.y, s.tint, arm);
          plot(s.x + 1, s.y, s.tint, arm);
          plot(s.x, s.y - 1, s.tint, arm);
          plot(s.x, s.y + 1, s.tint, arm);
          if (tw > 0.88) {
            const tip = a * 0.18;
            plot(s.x - 2, s.y, s.tint, tip);
            plot(s.x + 2, s.y, s.tint, tip);
            plot(s.x, s.y - 2, s.tint, tip);
            plot(s.x, s.y + 2, s.tint, tip);
          }
        }
      }
    };

    /** Two aurora curtains. Each has a bright lower edge that fades upward. */
    const RIBBONS = [
      { base: 0.3, amp: 0.07, height: 0.26, seed: 1, drift: 1, tint: 0 },
      { base: 0.45, amp: 0.05, height: 0.18, seed: 2, drift: -0.7, tint: 1 },
    ];

    /** Stepped aurora colours, green at the lower edge through teal to violet. */
    const AURORA_STEPS: RGB[] = Array.from({ length: 13 }, (_, k) => {
      const cf = k / 12;
      const [a, b, p] =
        cf < 0.5 ? [AURORA_LOW, AURORA_MID, cf / 0.5] : [AURORA_MID, AURORA_HIGH, (cf - 0.5) / 0.5];
      return [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p];
    });

    /**
     * Curtains as stepped bands: the alpha level depends only on height above
     * the edge and the slowly varying curtain strength, so contours stay
     * smooth. Fine vertical rays then step the brightness per column, which
     * reads as the hanging folds of a curtain. Added onto the sky, so it glows.
     */
    const drawAurora = (t: number) => {
      auroraCol.fill(0);
      for (const r of RIBBONS) {
        const ph = r.seed * 2.3;
        for (let x = 0; x < w; x++) {
          // Curtains slowly appear, drift and dissolve along the ribbon.
          const presence = smooth(0.25, 0.75, noise(x / 85 + t * 0.000018 * r.drift, r.seed * 13));
          if (presence <= 0) continue;
          const ripple = 0.85 + 0.15 * Math.sin(x * 0.09 - t * 0.0008 * r.drift + ph);
          const I = presence * ripple;
          // Rays: three solid brightness steps, drifting sideways.
          const rn = noise(x / 3.5 + t * 0.00011 * r.drift, r.seed * 13 + 5);
          const rays = rn > 0.62 ? 1 : rn > 0.38 ? 0.84 : 0.68;
          const edge = Math.round(
            horizon *
              (r.base +
                r.amp *
                  (0.7 * Math.sin(x * 0.011 + t * 0.00009 * r.drift + ph) +
                    0.3 * Math.sin(x * 0.029 - t * 0.00014 + ph * 2))),
          );
          const height =
            horizon * r.height * (0.55 + 0.6 * noise(x / 45 - t * 0.00003 * r.drift, r.seed * 13 + 9));
          auroraCol[x] = Math.max(auroraCol[x]!, I);
          const amp = AURORA_ALPHA * rays;
          for (let dy = 0; dy < height; dy++) {
            const y = edge - dy;
            if (y < 0) break;
            const f = dy / height;
            // The lower edge fades in over a few rows, then a long, even fade upward.
            const profile = dy < 3 ? 0.4 + 0.2 * dy : (1 - f) ** 1.2;
            const level = Math.floor(I * profile * AURORA_LEVELS) / AURORA_LEVELS;
            if (level <= 0) {
              if (dy < 3) continue;
              break;
            }
            const c = AURORA_STEPS[Math.min(12, Math.floor(f * 12) + r.tint * 2)]!;
            const a = level * amp;
            const i = (y * w + x) * 4;
            buf[i] = buf[i]! + c[0] * a;
            buf[i + 1] = buf[i + 1]! + c[1] * a;
            buf[i + 2] = buf[i + 2]! + c[2] * a;
          }
        }
      }
    };

    const drawShooting = () => {
      const s = shooting;
      if (!s) return;
      const p = s.age / s.life;
      const env = Math.min(1, p / 0.15) * Math.min(1, (1 - p) / 0.4);
      // The tail grows in over the first part of the flight.
      const len = Math.max(1, Math.round(s.len * Math.min(1, p * 3)));
      let lastX = Infinity;
      let lastY = Infinity;
      for (let i = 0; i < len; i++) {
        const x = Math.round(s.x - s.dx * i);
        const y = Math.round(s.y - s.dy * i);
        if (x === lastX && y === lastY) continue;
        lastX = x;
        lastY = y;
        const a = env * (1 - i / len) ** 1.2;
        // Stepped tail alpha keeps it crisp.
        plot(x, y, i === 0 ? SHOOTING_HEAD : SHOOTING_TAIL, Math.round(a * 4) / 4);
      }
    };

    const drawRiver = (t: number) => {
      const rows = h - horizon;
      // Per-row phases; the per-pixel work then only uses the sine table.
      for (let d = 0; d < rows; d++) {
        const depth = Math.min(1, d / riverH);
        rowShift[d] = Math.round(Math.sin(d * 0.8 + t * 0.0016) * (0.4 + depth * 1.6));
        rowWob[d] = d + t * 0.002;
        rowS1[d] = d * 2.1 + t * 0.0017;
        rowS2[d] = d * 1.3 - t * 0.0011;
        rowS3[d] = d + t * 0.0039;
        rowMix[d] = 0.5 - depth * 0.15;
      }

      // Row by row (rows follow the winding waterline), so writes stay mostly
      // sequential in memory.
      for (let d = 0; d < rows; d++) {
        const shift = rowShift[d]!;
        const wob = rowWob[d]!;
        const s1 = rowS1[d]!;
        const s2 = rowS2[d]!;
        const s3 = rowS3[d]!;
        const mix = rowMix[d]!;
        const back = 1 + Math.floor(d * 1.6);
        for (let x = 0; x < w; x++) {
          const y = wl[x]! + d;
          if (y >= near[x]!) continue;
          let sx = x + shift + Math.round(0.6 * sinL(x * 0.15 + wob));
          sx = sx < 0 ? 0 : sx >= w ? w - 1 : sx;
          // Mirror the rows just above the waterline, stretched a little.
          const srcY = Math.max(0, wl[sx]! - back);
          const si = (srcY * w + sx) * 4;
          const i = (y * w + x) * 4;
          buf[i] = WATER[0] + (buf[si]! * 0.75 - WATER[0]) * mix;
          buf[i + 1] = WATER[1] + (buf[si + 1]! * 0.75 - WATER[1]) * mix;
          buf[i + 2] = WATER[2] + (buf[si + 2]! * 0.8 - WATER[2]) * mix;

          // A faint wash of aurora colour where curtains hang above.
          const au = auroraCol[x]!;
          if (au > 0.25) blendAt(buf, i, AURORA_LOW, Math.floor(au * 3) * 0.02);

          // Horizontal shimmer streaks drifting across the surface.
          const sh = sinL(x * 0.19 + s1) + sinL(x * 0.067 + s2) * 0.8 + sinL(x * 0.47 + s3) * 0.3;
          if (sh > 1.75) blendAt(buf, i, GLINT, 0.32);
          else if (sh > 1.35) blendAt(buf, i, SHIMMER, 0.22);
        }
      }

      // The moon's broken, wavy reflection column, following the shoreline.
      if (illum < 0.04) return;
      const moonCol = Math.round(moonX);
      const strength = 0.75 * (0.35 + 0.65 * illum);
      for (let d = 0; d < rows; d++) {
        const n = noise(d * 0.9 + t * 0.0011, 31) * (0.6 + 0.4 * Math.sin(t * 0.0023 + d * 1.9));
        if (n < 0.28) continue;
        const depth = Math.min(1, d / riverH);
        const half = Math.round(moonR * (0.25 + 0.55 * depth) * n * (0.5 + 0.5 * illum));
        const cx = moonCol + Math.round(Math.sin(d * 1.7 + t * 0.0019) * 1.2 + Math.sin(t * 0.0011 + d * 0.5));
        for (let x = Math.max(0, cx - half); x <= Math.min(w - 1, cx + half); x++) {
          const y = wl[x]! + d;
          if (y >= near[x]!) continue;
          const edge = Math.abs(x - cx) === half && half > 0;
          plot(x, y, MOON_GLITTER, edge ? strength * 0.45 : strength);
        }
      }
    };

    /** Foreground banks: a dark silhouette with a lighter rim and short grass. */
    const drawNearBank = () => {
      for (let x = 0; x < w; x++) {
        const top = near[x]!;
        if (top >= h) continue;
        for (let y = top; y < h; y++) {
          const i = (y * w + x) * 4;
          const c = y === top ? NEAR_RIM : NEAR_BANK;
          buf[i] = c[0];
          buf[i + 1] = c[1];
          buf[i + 2] = c[2];
        }
        const blade = hash(x, seed + 95) < 0.55 ? 1 + Math.floor(hash(x, seed + 96) * 3) : 0;
        for (let j = 1; j <= blade; j++) plot(x, top - j, NEAR_BANK, 1);
      }
    };

    const drawReeds = (t: number) => {
      for (const r of reeds) {
        const sway = Math.sin(t * 0.0007 + r.phase) * 0.9 + Math.sin(t * 0.0017 + r.phase * 2) * 0.3;
        for (let j = 0; j < r.height; j++) {
          const p = j / r.height;
          const x = Math.round(r.x + (r.lean * j) + sway * p * p);
          const y = r.base - j;
          const head = r.head && j >= r.height - 4 && j < r.height - 1;
          plot(x, y, head ? CATTAIL : REED, 1);
          if (head) plot(x + 1, y, CATTAIL, 1);
        }
      }
    };

    const drawFireflies = (t: number) => {
      for (const f of fireflies) {
        // Each pulses on its own rhythm: a soft swell, then a dark pause.
        const cyc = ((t / f.period + f.phase) % 1 + 1) % 1;
        const pulse = cyc < 0.55 ? Math.sin((cyc / 0.55) * Math.PI) ** 2 : 0;
        const b = 0.12 + 0.88 * pulse;
        const x = Math.round(f.x);
        const y = Math.round(f.ground - f.lift);
        const a = Math.round(b * 4) / 4;
        if (a <= 0) continue;
        plot(x, y, FIREFLY, a);
        if (a >= 0.5) {
          const g = a * 0.4;
          plot(x - 1, y, FIREFLY_GLOW, g);
          plot(x + 1, y, FIREFLY_GLOW, g);
          plot(x, y - 1, FIREFLY_GLOW, g);
          plot(x, y + 1, FIREFLY_GLOW, g);
        }
        if (a >= 0.75) {
          const g = 0.12;
          plot(x - 1, y - 1, FIREFLY_GLOW, g);
          plot(x + 1, y - 1, FIREFLY_GLOW, g);
          plot(x - 1, y + 1, FIREFLY_GLOW, g);
          plot(x + 1, y + 1, FIREFLY_GLOW, g);
        }
        // A faint, wobbling reflection when hovering over water.
        const fc = Math.min(w - 1, Math.max(0, x));
        if (f.ground > wl[fc]! && f.ground < near[fc]!) {
          const ry = Math.round(f.ground + f.lift * 0.6);
          if (ry < near[fc]!) {
            const rx = x + Math.round(Math.sin(t * 0.003 + f.wander) * 0.8);
            plot(rx, ry, FIREFLY, a * 0.35);
          }
        }
      }
    };

    const draw = () => {
      if (!image) return;
      buf.set(staticBuf);
      const t = elapsed;
      drawStars(t);
      drawAurora(t);
      drawShooting();
      drawRiver(t);
      drawNearBank();
      drawReeds(t);
      drawFireflies(t);
      ctx.putImageData(image, 0, 0);
    };

    let frameId = 0;
    let lastFrame = 0;
    let running = true;
    // ~60fps cap. The slack absorbs rAF timing jitter so a 60Hz display draws
    // every frame and a 120Hz display draws exactly every other one.
    const FRAME_INTERVAL = 1000 / 60;
    const FRAME_SLACK = 4;

    const loop = (time: number) => {
      if (!running) return;
      if (time - lastFrame >= FRAME_INTERVAL - FRAME_SLACK) {
        lastFrame = time;
        step(time);
        draw();
      }
      frameId = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running || prefersReducedMotion) return;
      running = true;
      lastTime = 0;
      frameId = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frameId);
    };

    const onVisibility = () => (document.hidden ? stop() : start());

    resize();

    if (prefersReducedMotion) {
      running = false;
      draw();
    } else {
      frameId = requestAnimationFrame(loop);
      document.addEventListener('visibilitychange', onVisibility);
    }

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (prefersReducedMotion) draw();
    });
    resizeObserver.observe(canvas);

    return () => {
      stop();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [shootingStars]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none select-none [image-rendering:pixelated] ${className ?? ''}`}
    />
  );
}
