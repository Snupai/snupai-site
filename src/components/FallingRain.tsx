'use client';

import { useEffect, useRef } from 'react';

/** Size of one "art pixel" in CSS px. Finer than the leaves so streaks stay thin. */
const PX = 3;

type RGB = readonly [number, number, number];

/**
 * Depth layers, far → near. Nearer rain falls faster, leaves longer and
 * brighter streaks, and throws bigger splashes. Far rain lands "in the
 * distance" (fades out short of the ground) and never splashes.
 */
const LAYERS = [
  { share: 0.45, speed: [3.2, 4.2], len: [3, 5], alpha: 0.36, body: [127, 132, 156], head: [147, 153, 178], splash: 0, water: 0 },
  { share: 0.35, speed: [5.2, 6.6], len: [6, 9], alpha: 0.62, body: [116, 199, 236], head: [137, 220, 235], splash: 2, water: 0.012 },
  { share: 0.2, speed: [7.6, 9.6], len: [10, 15], alpha: 0.92, body: [137, 220, 235], head: [205, 214, 244], splash: 5, water: 0.03 },
] as const satisfies readonly {
  share: number;
  speed: readonly [number, number];
  len: readonly [number, number];
  alpha: number;
  body: RGB;
  head: RGB;
  splash: number;
  water: number;
}[];

const SPLASH: RGB = [180, 230, 250];
const WATER_DEEP: RGB = [30, 70, 104];
const WATER: RGB = [52, 110, 150];
const SHIMMER: RGB = [137, 220, 235];
const GLINT: RGB = [205, 240, 255];
const FOG: RGB = [148, 156, 184];
const FLASH: RGB = [214, 222, 255];

/** Fog alpha at full density. */
const FOG_ALPHA = 0.34;
/** Number of stepped fog density levels. */
const FOG_LEVELS = 5;
/** Peak alpha of a lightning glow. Kept low so it reads as distant and stays gentle on the eyes. */
const FLASH_ALPHA = 0.15;

/** Puddle depth limit in art pixels. */
const MAX_LEVEL = 3;
const MAX_PARTICLES = 400;
const MAX_RIPPLES = 80;

interface Drop {
  x: number;
  /** Head (lowest point) of the streak. */
  y: number;
  vx: number;
  vy: number;
  len: number;
  layer: 0 | 1 | 2;
  /** Far drops vanish at this row instead of reaching the ground. */
  endY: number;
  /** ms until this drop re-enters; > 0 means it is waiting off-screen. */
  wait: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Remaining life in ms. */
  life: number;
  maxLife: number;
  /** Static particles (the impact flash) ignore gravity. */
  still: boolean;
}

interface Ripple {
  x: number;
  age: number;
  maxR: number;
}

interface Gust {
  /** Signed peak strength, in slant units (horizontal px per vertical px). */
  strength: number;
  age: number;
  rise: number;
  hold: number;
  fall: number;
  /** Leading edge in art px; the gust sweeps across from the upwind side. */
  front: number;
}

interface Flash {
  /** Column the glow is centred on (the "cloud" that lit up). */
  x: number;
  age: number;
  /** Flicker pulses: start time (ms into the flash), decay time, strength 0..1. */
  pulses: { at: number; decay: number; peak: number }[];
}

interface FallingRainProps {
  className?: string;
  /** Whether pointer movement stirs the rain like a passing breeze. */
  interactive?: boolean;
  /** Whether low fog banks occasionally roll in. */
  fog?: boolean;
  /** Whether occasional storm spells bring faint lightning glows. */
  storms?: boolean;
}

/**
 * A pixel-art rain backdrop.
 *
 * Draws into an ImageData buffer at low resolution and scales it up with
 * nearest-neighbour sampling so every streak stays crisp. Rain falls in
 * three depth layers (speed, streak length and brightness grow with
 * nearness). A slowly wandering wind slants it, and occasional gusts sweep
 * across the screen from the upwind side, leaning the rain harder and
 * briefly thickening it. Near drops splash where they hit the bottom edge
 * (the top of the footer), throwing droplets and rippling a thin shimmering
 * puddle that fills up the longer the page stays open. The pointer acts as
 * a light breeze.
 *
 * The weather wanders too: now and then a dithered fog bank rolls in low
 * over the ground and drifts with the wind, and occasional storm spells
 * bring distant lightning, a faint glow that flickers once to three times
 * and briefly lights up the rain. Capped at ~60fps with an even cadence, pauses when hidden,
 * and respects prefers-reduced-motion with a single still frame (no
 * lightning).
 */
export default function FallingRain({
  className,
  interactive = true,
  fog: fogEnabled = true,
  storms: stormsEnabled = true,
}: FallingRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    // Canvas size in art pixels.
    let w = 0;
    let h = 0;
    let image: ImageData | null = null;
    let buf = new Uint8ClampedArray(0);

    let drops: Drop[] = [];
    let particles: Particle[] = [];
    let ripples: Ripple[] = [];
    // Puddle depth per column, in art pixels (fractional).
    let level = new Float32Array(0);
    let flowScratch = new Float32Array(0);

    // Wind is expressed as slant: horizontal px travelled per vertical px.
    let gust: Gust | null = null;
    let nextGust = 4000 + Math.random() * 6000;
    const windPhase = Math.random() * Math.PI * 2;

    let pointerX = -1;
    let pointerY = -1;
    let pointerVX = 0;

    let elapsed = 0;

    const rand = (min: number, max: number) => min + Math.random() * (max - min);

    // Weather. Fog always starts clear and eases toward a target that changes
    // every so often, so it only ever rolls in gradually. A fresh page can
    // already be stormy.
    const pickFog = () => (fogEnabled && Math.random() < 0.65 ? rand(0.45, 1) : 0);
    let fogTarget = pickFog();
    let fog = 0;
    let nextFogShift = rand(25000, 70000);
    let fogDrift = 0;

    let storm = stormsEnabled && Math.random() < 0.25;
    let nextStormShift = storm ? rand(40000, 90000) : rand(45000, 120000);
    let nextStrike = rand(2000, 6000);
    let flash: Flash | null = null;

    const pickLayer = (): 0 | 1 | 2 => {
      const r = Math.random();
      if (r < LAYERS[0].share) return 0;
      if (r < LAYERS[0].share + LAYERS[1].share) return 1;
      return 2;
    };

    /** Smooth background wind, before gusts. */
    const baseWind = (t: number) =>
      0.22 + 0.16 * Math.sin(t * 0.00009 + windPhase) + 0.1 * Math.sin(t * 0.00023 + 1.7);

    /** Gust envelope at time-in-gust (0..1). */
    const gustEnvelope = (g: Gust) => {
      if (g.age < g.rise) {
        const p = g.age / g.rise;
        return p * p * (3 - 2 * p);
      }
      if (g.age < g.rise + g.hold) return 1;
      const p = Math.min(1, (g.age - g.rise - g.hold) / g.fall);
      return 1 - p * p * (3 - 2 * p);
    };

    /** Gust contribution at column x: only where the front has already passed. */
    const gustAt = (x: number) => {
      if (!gust) return 0;
      const behind = gust.strength > 0 ? gust.front - x : x - gust.front;
      const reach = Math.min(1, Math.max(0, behind / 40));
      return gust.strength * gustEnvelope(gust) * reach;
    };

    /** Rough wind for spawn margins, ignoring the gust front. */
    const roughSlant = () =>
      baseWind(elapsed) + (gust ? gust.strength * gustEnvelope(gust) : 0);

    /** Overall rain intensity 0..1 controls how quickly finished drops return. */
    const intensity = () =>
      Math.min(
        1,
        0.78 +
          0.2 * Math.sin(elapsed * 0.00004 + windPhase * 2) +
          (gust ? 0.25 * gustEnvelope(gust) : 0) +
          (storm ? 0.12 : 0),
      );

    /** Current lightning brightness 0..1: a fast rise, then an exponential fade per pulse. */
    const flashLevel = () => {
      if (!flash) return 0;
      let v = 0;
      for (const p of flash.pulses) {
        const t = flash.age - p.at;
        if (t < 0) continue;
        v = Math.max(v, p.peak * Math.min(1, t / 30) * Math.exp(-Math.max(0, t - 30) / p.decay));
      }
      return v;
    };

    const strike = (): Flash => {
      // One to three flickers, spaced well apart (never more than ~3 per second).
      const count = 1 + (Math.random() < 0.6 ? 1 : 0) + (Math.random() < 0.3 ? 1 : 0);
      const pulses: Flash['pulses'] = [];
      let at = 0;
      for (let i = 0; i < count; i++) {
        pulses.push({ at, decay: rand(70, 160), peak: i === 0 ? rand(0.6, 1) : rand(0.35, 0.85) });
        at += rand(140, 260);
      }
      return { x: rand(0.1, 0.9) * w, age: 0, pulses };
    };

    const surfaceY = (x: number) => {
      const c = Math.min(w - 1, Math.max(0, Math.round(x)));
      return h - 1 - Math.floor(level[c] ?? 0);
    };

    const spawn = (drop: Drop | null, anywhere: boolean): Drop => {
      const layer = pickLayer();
      const L = LAYERS[layer];
      const vy = rand(L.speed[0], L.speed[1]);
      const slant = roughSlant();
      // Shift spawns upwind so the slanted rain still covers the whole width.
      const drift = slant * h;
      const x = rand(Math.min(0, -drift) - 8, w + Math.max(0, -drift) + 8);
      const len = Math.round(rand(L.len[0], L.len[1]));
      const d = drop ?? ({} as Drop);
      d.layer = layer;
      d.vy = vy;
      d.vx = slant * vy;
      d.len = len;
      d.y = anywhere ? rand(0, h) : rand(-len - 30, -1);
      d.x = anywhere ? rand(0, w) : x;
      d.endY = layer === 0 ? h - 1 - rand(0, h * 0.14) : h;
      d.wait = 0;
      return d;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const oldW = w;
      w = Math.max(1, Math.ceil(rect.width / PX));
      h = Math.max(1, Math.ceil(rect.height / PX));
      canvas.width = w;
      canvas.height = h;
      image = ctx.createImageData(w, h);
      buf = image.data;

      const next = new Float32Array(w);
      next.set(level.subarray(0, Math.min(oldW, w)));
      level = next;
      flowScratch = new Float32Array(w);

      // Density scales with area, capped to stay calm on big screens.
      const target = Math.min(440, Math.max(50, Math.round((w * h) / 650)));
      while (drops.length < target) drops.push(spawn(null, true));
      if (drops.length > target) drops = drops.slice(0, target);
      particles = particles.filter((p) => p.x < w);
      ripples = ripples.filter((r) => r.x < w);
    };

    // --- pixel buffer helpers -------------------------------------------

    /** Alpha-composite one pixel over the buffer (straight alpha). */
    const plot = (x: number, y: number, c: RGB, a: number) => {
      if (x < 0 || y < 0 || x >= w || y >= h || a <= 0) return;
      const i = (y * w + x) * 4;
      const da = buf[i + 3]! / 255;
      if (da === 0 || a >= 1) {
        buf[i] = c[0];
        buf[i + 1] = c[1];
        buf[i + 2] = c[2];
        buf[i + 3] = a * 255;
        return;
      }
      const oa = a + da * (1 - a);
      const keep = (da * (1 - a)) / oa;
      const add = a / oa;
      buf[i] = c[0] * add + buf[i]! * keep;
      buf[i + 1] = c[1] * add + buf[i + 1]! * keep;
      buf[i + 2] = c[2] * add + buf[i + 2]! * keep;
      buf[i + 3] = oa * 255;
    };

    // --- simulation -----------------------------------------------------

    const splash = (drop: Drop, x: number, y: number) => {
      const L = LAYERS[drop.layer];
      const col = Math.min(w - 1, Math.max(0, Math.round(x)));
      level[col] = Math.min(MAX_LEVEL, level[col]! + L.water);

      if (ripples.length < MAX_RIPPLES && level[col] > 0.6) {
        ripples.push({ x: col, age: 0, maxR: drop.layer === 2 ? rand(3, 6) : rand(1.5, 3) });
      }

      const room = MAX_PARTICLES - particles.length;
      if (room <= 0) return;

      // A one-frame flash either side of the impact point.
      if (drop.layer === 2 && room > 2) {
        for (const dx of [-1, 1]) {
          particles.push({ x: x + dx, y, vx: 0, vy: 0, life: 70, maxLife: 70, still: true });
        }
      }

      const count = Math.min(room, Math.round(rand(L.splash * 0.5, L.splash)));
      const energy = drop.layer === 2 ? 1 : 0.55;
      for (let i = 0; i < count; i++) {
        const life = rand(260, 520) * energy + 120;
        particles.push({
          x,
          y: y - 1,
          vx: rand(-1, 1) * energy + drop.vx * 0.18,
          vy: -rand(0.8, 2.1) * energy,
          life,
          maxLife: life,
          still: false,
        });
      }
    };

    /** Let the puddle spread out and very slowly evaporate. */
    const flowPuddle = (k: number) => {
      flowScratch.fill(0);
      for (let x = 0; x < w - 1; x++) {
        const diff = level[x]! - level[x + 1]!;
        const f = diff * 0.2 * Math.min(1, k);
        flowScratch[x] = flowScratch[x]! - f;
        flowScratch[x + 1] = flowScratch[x + 1]! + f;
      }
      const evap = 0.00002 * k;
      for (let x = 0; x < w; x++) {
        level[x] = Math.min(MAX_LEVEL, Math.max(0, level[x]! + flowScratch[x]! - evap));
      }
    };

    let lastTime = 0;

    const step = (time: number) => {
      const dt = lastTime ? Math.min(64, time - lastTime) : 16;
      lastTime = time;
      elapsed += dt;
      const k = dt / 16; // normalise to ~60fps units

      // Gusts: schedule, then sweep the front across the screen.
      if (gust) {
        gust.age += dt;
        gust.front += Math.sign(gust.strength) * (w / 1400) * dt;
        if (gust.age > gust.rise + gust.hold + gust.fall) {
          gust = null;
          nextGust = rand(7000, 18000);
        }
      } else if ((nextGust -= dt) <= 0) {
        // Gusts mostly push the way the wind already blows.
        const dir = Math.random() < 0.8 ? Math.sign(baseWind(elapsed)) || 1 : -1;
        const strength = dir * rand(0.25, 0.6);
        gust = {
          strength,
          age: 0,
          rise: rand(900, 1600),
          hold: rand(1200, 3500),
          fall: rand(2000, 4000),
          front: strength > 0 ? -40 : w + 40,
        };
      }

      pointerVX *= 0.9 ** k;
      const base = baseWind(elapsed);
      const respawnChance = intensity();

      // Fog: occasionally pick a new density, move steadily toward it, and
      // let the bank drift with the wind.
      if (fogEnabled && (nextFogShift -= dt) <= 0) {
        fogTarget = Math.random() < 0.25 ? 0 : rand(0.45, 1);
        nextFogShift = rand(25000, 70000);
      }
      // Roll in (or lift) at a steady pace: a full bank takes ~25s.
      const fogStep = dt / 25000;
      fog += Math.min(fogStep, Math.max(-fogStep, fogTarget - fog));
      fogDrift += roughSlant() * dt * 0.008;

      // Storm spells come and go; during one, lightning strikes every few seconds.
      if (stormsEnabled && (nextStormShift -= dt) <= 0) {
        storm = Math.random() < 0.35;
        nextStormShift = storm ? rand(40000, 90000) : rand(60000, 150000);
        nextStrike = rand(1500, 5000);
      }
      if (flash) {
        flash.age += dt;
        const last = flash.pulses[flash.pulses.length - 1]!;
        if (flash.age > last.at + last.decay * 6) flash = null;
      } else if (storm && (nextStrike -= dt) <= 0) {
        flash = strike();
        nextStrike = rand(5000, 16000);
      }

      for (const d of drops) {
        if (d.wait > 0) {
          d.wait -= dt;
          if (d.wait <= 0) spawn(d, false);
          continue;
        }

        let slant = base + gustAt(d.x);
        if (interactive && pointerX >= 0) {
          const dx = d.x - pointerX;
          const dy = d.y - pointerY;
          const d2 = dx * dx + dy * dy;
          if (d2 < 900) slant += pointerVX * 0.03 * (1 - d2 / 900);
        }
        // Nearer (heavier-looking) drops respond a little more sluggishly.
        const response = d.layer === 2 ? 0.06 : d.layer === 1 ? 0.08 : 0.1;
        d.vx += (slant * d.vy - d.vx) * response * k;
        d.x += d.vx * k;
        d.y += d.vy * k;

        const ground = d.layer === 0 ? d.endY : surfaceY(d.x);
        if (d.y >= ground) {
          if (d.layer > 0) splash(d, Math.round(d.x), ground);
          if (Math.random() < respawnChance) spawn(d, false);
          else d.wait = rand(150, 900);
          continue;
        }
        // Only recycle drops that have blown off the downwind side. Drops
        // spawned far upwind start offscreen on purpose and must be left to
        // drift in, or strong wind leaves the upwind corner dry.
        if ((d.vx >= 0 && d.x > w + 60) || (d.vx <= 0 && d.x < -60)) spawn(d, false);
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]!;
        p.life -= dt;
        if (!p.still) {
          p.vy += 0.16 * k;
          p.vx *= 0.99 ** k;
          p.x += p.vx * k;
          p.y += p.vy * k;
        }
        if (p.life <= 0 || (!p.still && p.vy > 0 && p.y >= surfaceY(p.x))) {
          particles[i] = particles[particles.length - 1]!;
          particles.pop();
        }
      }

      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i]!;
        r.age += dt;
        if (r.age * 0.012 > r.maxR) {
          ripples[i] = ripples[ripples.length - 1]!;
          ripples.pop();
        }
      }

      flowPuddle(k);
    };

    const drawDrop = (d: Drop, lit: number) => {
      const L = LAYERS[d.layer];
      const slope = d.vx / d.vy; // horizontal px per vertical px
      const hx = d.x;
      const hy = Math.round(d.y);
      // Far drops fade out as they reach their vanishing row.
      const fade =
        d.layer === 0 ? Math.min(1, Math.max(0, (d.endY - d.y) / 12) + 0.15) : 1;
      // Lightning makes the streaks catch the light.
      const boost = 1 + lit * 0.9;
      for (let i = 0; i < d.len; i++) {
        const y = hy - i;
        const x = Math.round(hx - slope * i);
        const t = i / d.len;
        const a = Math.min(1, L.alpha * fade * boost * (1 - t) ** 0.8);
        plot(x, y, i === 0 ? L.head : L.body, a);
      }
    };

    let flashCol = new Float32Array(0);

    /** Stable pseudo-random 0..1 per integer lattice point. */
    const hash = (x: number, y: number) => {
      let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
      n = Math.imul(n ^ (n >>> 13), 1274126177);
      return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    };

    /** Smooth 2D value noise, 0..1. */
    const noise = (x: number, y: number) => {
      const ix = Math.floor(x);
      const iy = Math.floor(y);
      const fx = x - ix;
      const fy = y - iy;
      const ux = fx * fx * (3 - 2 * fx);
      const uy = fy * fy * (3 - 2 * fy);
      const a = hash(ix, iy);
      const b = hash(ix + 1, iy);
      const c = hash(ix, iy + 1);
      const d = hash(ix + 1, iy + 1);
      return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
    };

    /**
     * Low fog: two octaves of drifting value noise make soft billows that
     * thicken toward the ground. Density is stepped into a few flat alpha
     * levels, so the fog reads as soft pixel-art contours.
     */
    const drawFog = (lit: number) => {
      if (fog < 0.02) return;
      const c: RGB = [
        FOG[0] + (FLASH[0] - FOG[0]) * lit,
        FOG[1] + (FLASH[1] - FOG[1]) * lit,
        FOG[2] + (FLASH[2] - FOG[2]) * lit,
      ];
      const alpha = FOG_ALPHA * (1 + lit * 0.6);
      // Big banks roll with the wind; finer wisps drift a bit slower and churn.
      const bigX = fogDrift / 70;
      const bigY = elapsed * 0.000035;
      const fineX = (fogDrift * 0.65) / 28;
      const fineY = -elapsed * 0.00008;
      const top = Math.floor(h * 0.34);
      // Sampled once per 2×2 block: chunkier pixels, and a quarter of the work.
      for (let y = top; y < h; y += 2) {
        const p = (y - top) / (h - top);
        const rise = fog * p * (2 - p);
        if (rise < 0.03) continue;
        const by = y / 20 + bigY;
        const fy = y / 10 + fineY + 40;
        for (let x = 0; x < w; x += 2) {
          const n = 0.75 * noise(x / 70 - bigX, by) + 0.25 * noise(x / 28 - fineX + 80, fy);
          // A solid base layer with gentle banks on top, so thin spots stay
          // fog-coloured instead of opening up into holes.
          const bank = Math.min(1, Math.max(0, (n - 0.2) / 0.6));
          const v = rise * (0.5 + 0.5 * bank);
          const level = Math.floor(v * FOG_LEVELS) / FOG_LEVELS;
          if (level <= 0) continue;
          const a = alpha * level;
          plot(x, y, c, a);
          plot(x + 1, y, c, a);
          plot(x, y + 1, c, a);
          plot(x + 1, y + 1, c, a);
        }
      }
    };

    /** A distant lightning glow: brightest high up, centred on one column. */
    const drawFlash = (lit: number) => {
      if (!flash || lit < 0.01) return;
      if (flashCol.length !== w) flashCol = new Float32Array(w);
      const spread = w * 0.35;
      for (let x = 0; x < w; x++) {
        const dx = (x - flash.x) / spread;
        flashCol[x] = 0.3 + 0.7 * Math.exp(-dx * dx);
      }
      for (let y = 0; y < h; y++) {
        const rowA = FLASH_ALPHA * lit * (1 - 0.65 * (y / h));
        for (let x = 0; x < w; x++) plot(x, y, FLASH, rowA * flashCol[x]!);
      }
    };

    const drawPuddle = () => {
      const t = elapsed;
      for (let x = 0; x < w; x++) {
        const lv = level[x]!;
        if (lv < 0.05) continue;
        const full = Math.floor(lv);
        const frac = lv - full;
        // Body rows: deeper water is darker.
        for (let r = 0; r < full; r++) {
          plot(x, h - 1 - r, r === 0 ? WATER_DEEP : WATER, 0.8);
        }
        // Surface row: partial depth shows as a fainter sheen, with a
        // drifting shimmer of highlights across it.
        const sy = h - 1 - full;
        const presence = full > 0 ? 1 : Math.min(1, frac * 1.6);
        const s =
          Math.sin(x * 0.21 + t * 0.0021) +
          Math.sin(x * 0.077 - t * 0.0013 + 2.1) * 0.8 +
          Math.sin(x * 0.53 + t * 0.0047) * 0.35;
        if (s > 1.3) plot(x, sy, GLINT, 0.95 * presence);
        else if (s > 0.35) plot(x, sy, SHIMMER, 0.75 * presence);
        else plot(x, sy, WATER, (0.6 + 0.3 * frac) * presence);
      }

      for (const r of ripples) {
        const radius = r.age * 0.012;
        const a = 0.9 * (1 - radius / r.maxR);
        const ri = Math.round(radius);
        for (const x of ri === 0 ? [r.x] : [r.x - ri, r.x + ri]) {
          if (x < 0 || x >= w) continue;
          plot(x, surfaceY(x), GLINT, a);
        }
      }
    };

    const draw = () => {
      if (!image) return;
      buf.fill(0);
      const lit = flashLevel();
      drawFlash(lit);
      drawPuddle();
      // Far to near so near rain lands on top. Fog sits between the far
      // layer and the rest, so distant rain disappears into it.
      for (let layer = 0; layer < 3; layer++) {
        for (const d of drops) if (d.layer === layer && d.wait <= 0) drawDrop(d, lit);
        if (layer === 0) drawFog(lit);
      }
      for (const p of particles) {
        const a = p.still ? 0.7 : 0.9 * Math.min(1, (p.life / p.maxLife) * 1.5);
        plot(Math.round(p.x), Math.round(p.y), SPLASH, a);
      }
      ctx.putImageData(image, 0, 0);
    };

    let frameId = 0;
    let lastFrame = 0;
    let running = true;
    // ~60fps cap. The slack absorbs rAF timing jitter so a 60Hz display draws
    // every frame and a 120Hz display draws exactly every other one, instead
    // of occasionally skipping a frame and juddering.
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

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / PX;
      const ny = (e.clientY - rect.top) / PX;
      if (pointerX >= 0) pointerVX += (nx - pointerX) * 0.5;
      pointerX = nx;
      pointerY = ny;
    };

    const onPointerLeave = () => {
      pointerX = -1;
      pointerY = -1;
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
      // A calm still frame: scattered streaks over a settled puddle line.
      running = false;
      level.fill(1.3);
      draw();
    } else {
      frameId = requestAnimationFrame(loop);
      if (interactive) {
        window.addEventListener('pointermove', onPointerMove, { passive: true });
        document.addEventListener('pointerleave', onPointerLeave);
      }
      document.addEventListener('visibilitychange', onVisibility);
    }

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (prefersReducedMotion) {
        level.fill(1.3);
        draw();
      }
    });
    resizeObserver.observe(canvas);

    return () => {
      stop();
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [interactive, fogEnabled, stormsEnabled]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none select-none [image-rendering:pixelated] ${className ?? ''}`}
    />
  );
}
