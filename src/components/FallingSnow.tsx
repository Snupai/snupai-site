'use client';

import { useEffect, useRef } from 'react';

/**
 * Snowflake sprites on a tiny pixel grid, smallest first.
 *   '1' = flake body, '2' = bright core, '.' = transparent.
 */
const SPRITES = [
  ['1'],
  ['11', '11'],
  ['.1.', '121', '.1.'],
  ['1.1.1', '.111.', '11211', '.111.', '1.1.1'],
  ['...1...', '.1.1.1.', '..111..', '1112111', '..111..', '.1.1.1.', '...1...'],
] as const;

/** How often each sprite size spawns (same order as SPRITES). */
const SPRITE_WEIGHTS = [0.42, 0.24, 0.2, 0.1, 0.04];

/** Flake tones from far (dim, cool) to near (bright): [body, core]. */
const FLAKE_TONES = [
  ['#7f93b3', '#a9bbd6'],
  ['#b4c4dd', '#dce6f5'],
  ['#e6eefa', '#ffffff'],
] as const;

/** Pile tones; index + 1 is stored in the pile grid, 0 = empty. */
const SNOW_COLORS = ['#f4f8ff', '#e3ebf7', '#d2dded', '#c0cee3'] as const;
/** Weighted toward the bright tones so the drift reads as fresh snow. */
const SNOW_TONE_WEIGHTS = [0.45, 0.3, 0.17, 0.08];

/** Size of one "art pixel" in CSS px. */
const PX = 4;

interface Flake {
  /** Centre of the sway, drifts with wind and breeze. */
  baseX: number;
  x: number;
  y: number;
  /** Extra horizontal velocity from the pointer breeze. */
  vx: number;
  fall: number;
  swayAmp: number;
  swayFreq: number;
  phase: number;
  /** How strongly the shared wind pushes this flake (small flakes drift more). */
  drift: number;
  sprite: number;
  tone: number;
}

interface FallingSnowProps {
  className?: string;
  /** Whether the pointer gently pushes nearby flakes away. */
  interactive?: boolean;
}

const pickWeighted = (weights: readonly number[]) => {
  let r = Math.random();
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return i;
  }
  return weights.length - 1;
};

/**
 * A calm pixel-art snowfall backdrop.
 *
 * Renders to a low-resolution canvas scaled up with nearest-neighbour
 * sampling so every flake stays crisp and blocky. Flakes come in a few sizes;
 * smaller ones are dimmer, slower and more wind-blown, giving a sense of
 * depth. Each sways gently while a slow, gusting wind pushes them all, and
 * flakes that reach the bottom settle into a drift that grows the longer the
 * page is open, up to a capped, gently mounded height. The pointer acts as a
 * light breeze. Throttled to ~30fps, pauses when hidden, and respects
 * prefers-reduced-motion.
 */
export default function FallingSnow({
  className,
  interactive = true,
}: FallingSnowProps) {
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
    let flakes: Flake[] = [];

    // Snow pile: grid of colour indices (+1), row 0 = bottom of the canvas.
    // Columns are always filled contiguously from the bottom, so `heights`
    // fully describes the surface.
    let pileCap = 0;
    let pile = new Uint8Array(0);
    let heights = new Int16Array(0);
    const pileCanvas = document.createElement('canvas');
    const pileCtx = pileCanvas.getContext('2d');
    const capPhase1 = Math.random() * Math.PI * 2;
    const capPhase2 = Math.random() * Math.PI * 2;

    // Pointer in art-pixel coordinates; smoothed horizontal velocity for the breeze.
    let pointerX = -1;
    let pointerY = -1;
    let pointerVX = 0;

    const rand = (min: number, max: number) => min + Math.random() * (max - min);

    const spawn = (anywhere: boolean): Flake => {
      const sprite = pickWeighted(SPRITE_WEIGHTS);
      // Bigger flakes are nearer: brighter, a little faster, less wind-blown.
      const near = sprite / (SPRITES.length - 1);
      const tone = Math.min(
        FLAKE_TONES.length - 1,
        Math.floor(near * FLAKE_TONES.length + Math.random() * 1.2),
      );
      const x = Math.random() * w;
      return {
        baseX: x,
        x,
        y: anywhere ? Math.random() * h : rand(-12, -4),
        vx: 0,
        fall: rand(0.18, 0.3) + near * rand(0.12, 0.3),
        swayAmp: rand(1, 3.5) + near * 2,
        swayFreq: rand(0.0008, 0.0018),
        phase: Math.random() * Math.PI * 2,
        drift: rand(0.8, 1.3) * (1.4 - near * 0.7),
        sprite,
        tone,
      };
    };

    /** Paint one pile cell onto the offscreen pile canvas. */
    const paintPileCell = (x: number, row: number) => {
      if (!pileCtx) return;
      const c = pile[row * w + x]!;
      const y = pileCap - 1 - row;
      if (c === 0) {
        pileCtx.clearRect(x, y, 1, 1);
      } else {
        pileCtx.fillStyle = SNOW_COLORS[c - 1]!;
        pileCtx.fillRect(x, y, 1, 1);
      }
    };

    /** Rebuild pile storage for a new size, keeping whatever overlaps. */
    const resizePile = (oldW: number, oldCap: number) => {
      const newCap = Math.max(6, Math.min(28, Math.round(h * 0.1)));
      const next = new Uint8Array(w * newCap);
      const rows = Math.min(oldCap, newCap);
      const cols = Math.min(oldW, w);
      for (let r = 0; r < rows; r++) {
        for (let x = 0; x < cols; x++) next[r * w + x] = pile[r * oldW + x]!;
      }
      pile = next;
      pileCap = newCap;
      heights = new Int16Array(w);
      pileCanvas.width = w;
      pileCanvas.height = pileCap;
      for (let x = 0; x < w; x++) {
        for (let r = 0; r < pileCap && pile[r * w + x]; r++) {
          heights[x] = r + 1;
          paintPileCell(x, r);
        }
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const oldW = w;
      const oldCap = pileCap;
      w = Math.max(1, Math.ceil(rect.width / PX));
      h = Math.max(1, Math.ceil(rect.height / PX));
      canvas.width = w;
      canvas.height = h;
      resizePile(oldW, oldCap);
      // Density scales with area, capped to stay calm on big screens. Flakes
      // are much smaller than leaves, so there are more of them.
      const target = Math.min(180, Math.max(30, Math.round((w * h) / 900)));
      while (flakes.length < target) flakes.push(spawn(true));
      if (flakes.length > target) flakes = flakes.slice(0, target);
    };

    const drawFlake = (flake: Flake) => {
      const sprite = SPRITES[flake.sprite]!;
      const size = sprite.length;
      const half = (size - 1) / 2;
      const [body, core] = FLAKE_TONES[flake.tone]!;
      const left = Math.round(flake.x - half);
      const top = Math.round(flake.y - half);
      for (let sy = 0; sy < size; sy++) {
        const row = sprite[sy]!;
        for (let sx = 0; sx < size; sx++) {
          const ch = row[sx];
          if (ch === '.') continue;
          ctx.fillStyle = ch === '2' ? core : body;
          ctx.fillRect(left + sx, top + sy, 1, 1);
        }
      }
    };

    /**
     * Max pile height at a column: a gentle wavy contour so a full drift reads
     * as rolling mounds rather than a flat-topped wall.
     */
    const capAt = (x: number) => {
      const wave =
        0.6 * Math.sin(x * 0.035 + capPhase1) + 0.4 * Math.sin(x * 0.09 + capPhase2);
      return Math.floor(pileCap * (0.7 + 0.15 * (wave + 1)));
    };

    /** Move the top cell of column `from` onto column `to`. */
    const slide = (from: number, to: number) => {
      const fromRow = heights[from]! - 1;
      const toRow = heights[to]!;
      pile[toRow * w + to] = pile[fromRow * w + from]!;
      pile[fromRow * w + from] = 0;
      heights[from] = fromRow;
      heights[to] = toRow + 1;
      paintPileCell(from, fromRow);
      paintPileCell(to, toRow);
    };

    /**
     * Let steep spots slump into neighbours like powder would, so the surface
     * stays continuous with no narrow gaps or spikes. Cells can slip up to
     * SLUMP_REACH columns, giving a shallow angle of repose (every move lowers
     * a cell, so this always terminates).
     */
    const SLUMP_REACH = 3;
    const relax = (x0: number, x1: number) => {
      const lo = Math.max(0, x0);
      const hi = Math.min(w - 1, x1);
      for (let pass = 0; pass < 24; pass++) {
        let changed = false;
        for (let x = lo; x <= hi; x++) {
          for (let d = 1; d <= SLUMP_REACH; d++) {
            for (const n of [x - d, x + d]) {
              if (n < 0 || n >= w) continue;
              while (heights[x]! - heights[n]! > 1 && heights[n]! < capAt(n)) {
                slide(x, n);
                changed = true;
              }
            }
          }
        }
        if (!changed) break;
      }
    };

    /**
     * Settle a landed flake into the drift. Each column it covers gains one
     * cell resting directly on the surface below (bigger flakes cover more
     * columns), so the drift builds up slowly and never has gaps underneath.
     */
    const settle = (flake: Flake) => {
      const cx = Math.round(flake.x);
      const spread = Math.floor(SPRITES[flake.sprite]!.length / 2);
      for (let x = cx - spread; x <= cx + spread; x++) {
        if (x < 0 || x >= w) continue;
        const row = heights[x]!;
        if (row >= capAt(x)) continue;
        pile[row * w + x] = pickWeighted(SNOW_TONE_WEIGHTS) + 1;
        paintPileCell(x, row);
        heights[x] = row + 1;
      }
      relax(cx - spread - 6, cx + spread + 6);
    };

    let lastTime = 0;

    const step = (time: number) => {
      const dt = lastTime ? Math.min(64, time - lastTime) : 16;
      lastTime = time;
      const k = dt / 16; // normalise to ~60fps units

      // Slow, layered gusts shared by every flake.
      const wind =
        0.09 * Math.sin(time * 0.00009) +
        0.05 * Math.sin(time * 0.00031 + 1.3) +
        0.03 * Math.sin(time * 0.0011 + 2.1);

      // Let the breeze decay.
      pointerVX *= 0.9;

      for (let i = 0; i < flakes.length; i++) {
        const flake = flakes[i]!;

        // Pointer breeze: nudge flakes near the cursor along its motion and
        // slightly away from it.
        if (interactive && pointerX >= 0) {
          const dx = flake.x - pointerX;
          const dy = flake.y - pointerY;
          const d2 = dx * dx + dy * dy;
          if (d2 < 400) {
            const f = 1 - d2 / 400;
            const d = Math.sqrt(d2) || 1;
            flake.vx += (pointerVX * 0.04 + (dx / d) * 0.05) * f;
          }
        }
        flake.vx *= 0.96;

        flake.phase += flake.swayFreq * dt;
        flake.baseX += (wind * flake.drift + flake.vx) * k;
        flake.x = flake.baseX + flake.swayAmp * Math.sin(flake.phase);
        flake.y += flake.fall * k;

        if (flake.baseX < -10 || flake.baseX > w + 10) {
          flakes[i] = spawn(false);
          continue;
        }

        const col = Math.min(w - 1, Math.max(0, Math.round(flake.x)));
        const half = Math.floor(SPRITES[flake.sprite]!.length / 2);
        const above = h - 1 - (Math.round(flake.y) + half);
        if (above <= heights[col]!) {
          settle(flake);
          flakes[i] = spawn(false);
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      if (pileCap > 0) ctx.drawImage(pileCanvas, 0, h - pileCap);
      for (const flake of flakes) drawFlake(flake);
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
      running = false;
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
      if (prefersReducedMotion) draw();
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
