'use client';

import { useEffect, useRef } from 'react';

/**
 * Leaf sprites on a tiny pixel grid.
 *   '1' = leaf body, '2' = vein / stem (darker shade), '.' = transparent.
 */
const SPRITES = [
  // maple
  [
    '....1....',
    '.1..1..1.',
    '.1.111.1.',
    '111121111',
    '.1112111.',
    '..11211..',
    '...121...',
    '....2....',
    '....2....',
  ],
  // oak (lobed)
  [
    '...1...',
    '..111..',
    '.11211.',
    '..121..',
    '.11211.',
    '1112111',
    '.11211.',
    '..121..',
    '...2...',
    '...2...',
  ],
  // elm / oval
  [
    '...1...',
    '..111..',
    '.11211.',
    '.11211.',
    '1112111',
    '.11211.',
    '..121..',
    '...2...',
  ],
  // ginkgo fan
  [
    '1.111.1',
    '1111111',
    '1121211',
    '.12121.',
    '..121..',
    '...2...',
    '...2...',
  ],
  // small birch
  [
    '..1..',
    '.111.',
    '11211',
    '.121.',
    '..2..',
    '..2..',
  ],
] as const;

/** Autumn tones: [front body, vein / stem, back-side body]. */
const PALETTES = [
  ['#d2691e', '#7a3510', '#a8521a'], // burnt orange
  ['#e07b24', '#8b4513', '#b5601c'], // pumpkin
  ['#b7410e', '#5e2008', '#8f330c'], // rust
  ['#a52a2a', '#561313', '#7d2020'], // crimson
  ['#daa520', '#7f5a07', '#b0841a'], // goldenrod
  ['#c8902a', '#6f4a10', '#a07220'], // ochre
  ['#8b5a2b', '#45290f', '#6b4422'], // dry brown
] as const;

/** Flat colour table; index = palette * 3 + shade. 0 in the pile grid = empty. */
const COLORS = PALETTES.flat();

/** Size of one "art pixel" in CSS px. */
const PX = 4;

interface Leaf {
  /** Centre of the swing, drifts with wind and breeze. */
  baseX: number;
  x: number;
  y: number;
  /** Extra horizontal velocity from the pointer breeze. */
  vx: number;
  fall: number;
  swingAmp: number;
  swingFreq: number;
  phase: number;
  /** Resting in-plane orientation of the leaf (radians). */
  orient: number;
  tiltMax: number;
  /** Rotation about the leaf's own axis, drives horizontal foreshortening. */
  flip: number;
  flipVel: number;
  rockAmp: number;
  /** Tumblers spin end over end instead of gliding side to side. */
  tumbler: boolean;
  spinVel: number;
  sprite: number;
  palette: number;
  /** Lowest drawn pixel relative to y, refreshed every draw. */
  bottom: number;
}

interface FallingLeavesProps {
  className?: string;
  /** Whether the pointer gently pushes nearby leaves away. */
  interactive?: boolean;
}

/**
 * A calm pixel-art falling-leaves backdrop.
 *
 * Renders to a low-resolution canvas scaled up with nearest-neighbour
 * sampling so every leaf stays crisp and blocky. Leaves fall like real ones:
 * most glide in a pendulum "falling leaf" swing (tilting into the swing,
 * slowing and briefly lifting at each end), while some tumble end over end.
 * Each leaf rotates in-plane and foreshortens on two axes, showing its darker
 * back side mid-flip, and a slow gusting wind pushes them all. Leaves that
 * reach the bottom drape onto a pile that grows the longer the page is open,
 * up to a capped height. The pointer acts as a light breeze. Throttled to
 * ~30fps, pauses when hidden, and respects prefers-reduced-motion.
 */
export default function FallingLeaves({
  className,
  interactive = true,
}: FallingLeavesProps) {
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
    let leaves: Leaf[] = [];

    // Leaf pile: grid of colour indices (+1), row 0 = bottom of the screen.
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

    const spawn = (anywhere: boolean): Leaf => {
      const tumbler = Math.random() < 0.25;
      const x = Math.random() * w;
      return {
        baseX: x,
        x,
        y: anywhere ? Math.random() * h * 0.85 : rand(-30, -10),
        vx: 0,
        fall: tumbler ? rand(0.35, 0.55) : rand(0.22, 0.4),
        swingAmp: tumbler ? rand(1, 3) : rand(4, 11),
        swingFreq: rand(0.0011, 0.002),
        phase: Math.random() * Math.PI * 2,
        orient: rand(-0.6, 0.6),
        tiltMax: rand(0.45, 0.85),
        flip: rand(-0.4, 0.4),
        flipVel: tumbler ? rand(0.004, 0.008) * (Math.random() < 0.5 ? -1 : 1) : 0,
        rockAmp: rand(0.5, 1.1),
        tumbler,
        spinVel: tumbler ? rand(0.0015, 0.004) * (Math.random() < 0.5 ? -1 : 1) : 0,
        sprite: Math.floor(Math.random() * SPRITES.length),
        palette: Math.floor(Math.random() * PALETTES.length),
        bottom: 4,
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
        pileCtx.fillStyle = COLORS[c - 1]!;
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
      // Density scales with area, capped to stay calm on big screens.
      const target = Math.min(70, Math.max(14, Math.round((w * h) / 2600)));
      while (leaves.length < target) leaves.push(spawn(true));
      if (leaves.length > target) leaves = leaves.slice(0, target);
    };

    /** Current in-plane rotation and two-axis foreshortening of a leaf. */
    const pose = (leaf: Leaf) => {
      const swing = Math.cos(leaf.phase); // ∝ sideways velocity
      const theta = leaf.tumbler
        ? leaf.orient
        : leaf.orient + leaf.tiltMax * swing; // dip into the swing
      const a = Math.cos(
        leaf.tumbler ? leaf.flip : leaf.flip + leaf.rockAmp * Math.sin(leaf.phase),
      );
      // Pitch: the leaf foreshortens vertically near the ends of each swing.
      const b = Math.cos(leaf.tumbler ? leaf.flip * 0.6 : 0.7 * Math.sin(leaf.phase));
      return { theta, a, b };
    };

    /**
     * Draw a leaf by inverse-mapping each screen pixel in its bounding box back
     * into sprite space (rotate, then un-scale), so rotated leaves have no holes.
     */
    const drawLeaf = (leaf: Leaf) => {
      const sprite = SPRITES[leaf.sprite]!;
      const sh = sprite.length;
      const sw = sprite[0].length;
      const halfW = (sw - 1) / 2;
      const halfH = (sh - 1) / 2;
      const { theta, a, b } = pose(leaf);
      const sa = Math.sign(a) * Math.max(0.16, Math.abs(a));
      const sb = Math.sign(b || 1) * Math.max(0.3, Math.abs(b));
      const back = sa * sb < 0;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const cx = Math.round(leaf.x);
      const cy = Math.round(leaf.y);
      const r = Math.ceil(Math.max(sw, sh) / 2) + 1;
      const shadeBase = leaf.palette * 3;
      let bottom = -r;

      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const p = cos * dx + sin * dy;
          const q = -sin * dx + cos * dy;
          const sx = Math.round(p / sa + halfW);
          const sy = Math.round(q / sb + halfH);
          if (sx < 0 || sy < 0 || sx >= sw || sy >= sh) continue;
          const ch = sprite[sy]![sx];
          if (ch === '.') continue;
          const shade = ch === '2' ? 1 : back ? 2 : 0;
          ctx.fillStyle = COLORS[shadeBase + shade]!;
          ctx.fillRect(cx + dx, cy + dy, 1, 1);
          if (dy > bottom) bottom = dy;
        }
      }
      leaf.bottom = bottom;
    };

    /**
     * Max pile height at a column: a gentle wavy contour so a full pile reads
     * as a mound of leaves rather than a flat-topped wall.
     */
    const capAt = (x: number) => {
      const wave =
        0.6 * Math.sin(x * 0.045 + capPhase1) + 0.4 * Math.sin(x * 0.11 + capPhase2);
      return Math.floor(pileCap * (0.72 + 0.14 * (wave + 1)));
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
     * Let steep spots slump into neighbours like loose leaves would, so the
     * surface stays continuous instead of leaving deep narrow gaps. Cells can
     * slip up to SLUMP_REACH columns, giving a shallow angle of repose (every
     * move lowers a cell, so this always terminates).
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
     * Drape a landed leaf over the pile: it lies flat (full width, squashed
     * vertically) and each of its columns rests directly on the surface below,
     * so there are never gaps underneath.
     */
    const settle = (leaf: Leaf) => {
      const cx = Math.round(leaf.x);
      const sprite = SPRITES[leaf.sprite]!;
      const sh = sprite.length;
      const sw = sprite[0].length;
      const halfW = (sw - 1) / 2;
      const flat = rand(0.35, 0.6);
      const flip = Math.random() < 0.5;
      const showBack = Math.random() < 0.35;
      const shadeBase = leaf.palette * 3;

      // Per column: squashed rows → colour (later rows overwrite merged ones).
      const columns = new Map<number, Map<number, number>>();
      for (let sy = 0; sy < sh; sy++) {
        const row = sprite[sy]!;
        const r = Math.round((sh - 1 - sy) * flat);
        for (let sx = 0; sx < sw; sx++) {
          const ch = row[sx];
          if (ch === '.') continue;
          const x = cx + Math.round((flip ? sw - 1 - sx : sx) - halfW);
          if (x < 0 || x >= w) continue;
          const shade = ch === '2' ? 1 : showBack ? 2 : 0;
          let col = columns.get(x);
          if (!col) columns.set(x, (col = new Map<number, number>()));
          col.set(r, shadeBase + shade + 1);
        }
      }

      for (const [x, col] of columns) {
        const cells = [...col.entries()].sort((p, q) => p[0] - q[0]).map((e) => e[1]);
        // Stack on the surface; once full, refresh the top layer instead.
        const start = Math.max(0, Math.min(heights[x]!, capAt(x) - cells.length));
        cells.forEach((c, i) => {
          const row = start + i;
          if (row >= pileCap) return;
          pile[row * w + x] = c;
          paintPileCell(x, row);
        });
        heights[x] = Math.max(heights[x]!, Math.min(pileCap, start + cells.length));
      }

      relax(cx - sw - 8, cx + sw + 8);
    };

    let lastTime = 0;

    const step = (time: number) => {
      const dt = lastTime ? Math.min(64, time - lastTime) : 16;
      lastTime = time;
      const k = dt / 16; // normalise to ~60fps units

      // Slow, layered gusts shared by every leaf.
      const wind =
        0.1 * Math.sin(time * 0.00011) + 0.06 * Math.sin(time * 0.00037 + 1.3);

      // Let the breeze decay.
      pointerVX *= 0.9;

      for (let i = 0; i < leaves.length; i++) {
        const leaf = leaves[i]!;

        // Pointer breeze: nudge leaves near the cursor along its motion and
        // slightly away from it, and set them fluttering.
        if (interactive && pointerX >= 0) {
          const dx = leaf.x - pointerX;
          const dy = leaf.y - pointerY;
          const d2 = dx * dx + dy * dy;
          if (d2 < 400) {
            const f = 1 - d2 / 400;
            const d = Math.sqrt(d2) || 1;
            leaf.vx += (pointerVX * 0.04 + (dx / d) * 0.05) * f;
            leaf.flipVel += 0.0006 * f * Math.sign(pointerVX || 1);
          }
        }
        leaf.vx *= 0.96;

        leaf.phase += leaf.swingFreq * dt;
        const swing = Math.cos(leaf.phase);
        leaf.baseX += (wind + leaf.vx) * k;
        leaf.x = leaf.baseX + leaf.swingAmp * Math.sin(leaf.phase);

        if (leaf.tumbler) {
          leaf.y += leaf.fall * k;
          leaf.orient += leaf.spinVel * dt;
          leaf.flip += leaf.flipVel * dt;
        } else {
          // Fastest through the bottom of the swing, a brief lift at the ends.
          leaf.y += leaf.fall * k * (1.35 * swing * swing - 0.12);
          leaf.flip += leaf.flipVel * dt;
          leaf.flipVel *= 0.985; // breeze-induced flutter settles back down
        }

        if (leaf.baseX < -20 || leaf.baseX > w + 20) {
          leaves[i] = spawn(false);
          continue;
        }

        const col = Math.min(w - 1, Math.max(0, Math.round(leaf.x)));
        const above = h - 1 - (Math.round(leaf.y) + leaf.bottom);
        if (above <= heights[col]!) {
          settle(leaf);
          leaves[i] = spawn(false);
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      if (pileCap > 0) ctx.drawImage(pileCanvas, 0, h - pileCap);
      for (const leaf of leaves) drawLeaf(leaf);
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
