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

interface FallingRainProps {
  className?: string;
  /** Whether pointer movement stirs the rain like a passing breeze. */
  interactive?: boolean;
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
 * a light breeze. Throttled to ~30fps, pauses when hidden, and respects
 * prefers-reduced-motion with a single still frame.
 */
export default function FallingRain({
  className,
  interactive = true,
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
          (gust ? 0.25 * gustEnvelope(gust) : 0),
      );

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

      pointerVX *= 0.9;
      const base = baseWind(elapsed);
      const respawnChance = intensity();

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
        if (d.x < -60 || d.x > w + 60) spawn(d, false);
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]!;
        p.life -= dt;
        if (!p.still) {
          p.vy += 0.16 * k;
          p.vx *= 0.99;
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

    const drawDrop = (d: Drop) => {
      const L = LAYERS[d.layer];
      const slope = d.vx / d.vy; // horizontal px per vertical px
      const hx = d.x;
      const hy = Math.round(d.y);
      // Far drops fade out as they reach their vanishing row.
      const fade =
        d.layer === 0 ? Math.min(1, Math.max(0, (d.endY - d.y) / 12) + 0.15) : 1;
      for (let i = 0; i < d.len; i++) {
        const y = hy - i;
        const x = Math.round(hx - slope * i);
        const t = i / d.len;
        const a = L.alpha * fade * (1 - t) ** 0.8;
        plot(x, y, i === 0 ? L.head : L.body, a);
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
          plot(x, h - 1 - r, r === 0 ? WATER_DEEP : WATER, 0.7);
        }
        // Surface row: partial depth shows as a fainter sheen, with a
        // drifting shimmer of highlights across it.
        const sy = h - 1 - full;
        const presence = full > 0 ? 1 : Math.min(1, frac * 1.6);
        const s =
          Math.sin(x * 0.21 + t * 0.0021) +
          Math.sin(x * 0.077 - t * 0.0013 + 2.1) * 0.8 +
          Math.sin(x * 0.53 + t * 0.0047) * 0.35;
        if (s > 1.45) plot(x, sy, GLINT, 0.85 * presence);
        else if (s > 0.6) plot(x, sy, SHIMMER, 0.6 * presence);
        else plot(x, sy, WATER, (0.35 + 0.35 * frac) * presence);
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
      drawPuddle();
      // Far to near so near rain lands on top.
      for (let layer = 0; layer < 3; layer++) {
        for (const d of drops) if (d.layer === layer && d.wait <= 0) drawDrop(d);
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
    const FRAME_INTERVAL = 1000 / 30;

    const loop = (time: number) => {
      if (!running) return;
      if (time - lastFrame >= FRAME_INTERVAL) {
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
  }, [interactive]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none select-none [image-rendering:pixelated] ${className ?? ''}`}
    />
  );
}
