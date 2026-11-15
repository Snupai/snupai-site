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
  x: number;
  y: number;
  vy: number;
  vx: number;
  swayAmp: number;
  swayFreq: number;
  swayPhase: number;
  spin: number;
  spinSpeed: number;
  sprite: number;
  palette: number;
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
 * sampling so every leaf stays crisp and blocky. Leaves drift down with a
 * soft sideways sway and "tumble" by squashing horizontally (showing their
 * darker back side mid-flip). Leaves that reach the bottom settle into a pile
 * that slowly grows the longer the page is open, up to a capped height. The
 * pointer acts as a light breeze. Throttled to ~30fps, pauses when hidden, and
 * respects prefers-reduced-motion.
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

    const spawn = (anywhere: boolean): Leaf => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : -10 - Math.random() * 20,
      vy: 0.12 + Math.random() * 0.22,
      vx: 0,
      swayAmp: 0.15 + Math.random() * 0.35,
      swayFreq: 0.0006 + Math.random() * 0.0009,
      swayPhase: Math.random() * Math.PI * 2,
      spin: Math.random() * Math.PI * 2,
      spinSpeed: 0.0008 + Math.random() * 0.0018,
      sprite: Math.floor(Math.random() * SPRITES.length),
      palette: Math.floor(Math.random() * PALETTES.length),
    });

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
        for (let r = 0; r < pileCap; r++) {
          if (pile[r * w + x]) {
            heights[x] = r + 1;
            paintPileCell(x, r);
          }
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

    /**
     * Visit every pixel of a leaf at its current tumble. Offsets are relative
     * to the leaf centre; `rowFromBottom` counts up from the sprite's base.
     */
    const forEachPixel = (
      leaf: Leaf,
      minScale: number,
      fn: (dx: number, dy: number, rowFromBottom: number, color: number) => void,
    ) => {
      const sprite = SPRITES[leaf.sprite]!;
      const sh = sprite.length;
      const sw = sprite[0].length;
      const halfW = (sw - 1) / 2;
      const halfH = Math.round((sh - 1) / 2);
      // Tumble: squash horizontally by cos(spin); flip to back side when < 0.
      const c = Math.cos(leaf.spin);
      const facingBack = c < 0;
      const scale = Math.max(minScale, Math.abs(c));
      const base = leaf.palette * 3;

      for (let sy = 0; sy < sh; sy++) {
        const row = sprite[sy]!;
        for (let sx = 0; sx < sw; sx++) {
          const ch = row[sx];
          if (ch === '.') continue;
          const srcX = facingBack ? sw - 1 - sx : sx;
          const shade = ch === '2' ? 1 : facingBack ? 2 : 0;
          fn(
            Math.round((srcX - halfW) * scale),
            sy - halfH,
            sh - 1 - sy,
            base + shade,
          );
        }
      }
    };

    const drawLeaf = (leaf: Leaf) => {
      const cx = Math.round(leaf.x);
      const cy = Math.round(leaf.y);
      forEachPixel(leaf, 0.18, (dx, dy, _r, color) => {
        ctx.fillStyle = COLORS[color]!;
        ctx.fillRect(cx + dx, cy + dy, 1, 1);
      });
    };

    /** Height of the leaf's lowest pixel above the screen bottom, in art px. */
    const leafBottom = (leaf: Leaf) => {
      const sprite = SPRITES[leaf.sprite]!;
      const sh = sprite.length;
      return h - 1 - (Math.round(leaf.y) + sh - 1 - Math.round((sh - 1) / 2));
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

    /**
     * Stamp a landed leaf into the pile, lying flat (full width, squashed
     * vertically) on top of whatever is already under it.
     */
    const settle = (leaf: Leaf) => {
      const cx = Math.round(leaf.x);
      const sprite = SPRITES[leaf.sprite]!;
      const sh = sprite.length;
      const sw = sprite[0].length;
      const halfW = (sw - 1) / 2;
      const flat = 0.35 + Math.random() * 0.3;
      const flip = Math.random() < 0.5;
      const showBack = Math.random() < 0.35;
      const paletteBase = leaf.palette * 3;
      const flatH = Math.max(1, Math.round((sh - 1) * flat) + 1);

      const pixels: [number, number, number][] = [];
      let base = 0;
      for (let sy = 0; sy < sh; sy++) {
        const row = sprite[sy]!;
        const r = Math.round((sh - 1 - sy) * flat);
        for (let sx = 0; sx < sw; sx++) {
          const ch = row[sx];
          if (ch === '.') continue;
          const x = cx + Math.round(((flip ? sw - 1 - sx : sx) - halfW));
          if (x < 0 || x >= w) continue;
          const shade = ch === '2' ? 1 : showBack ? 2 : 0;
          pixels.push([x, r, paletteBase + shade]);
          base = Math.max(base, heights[x]! - r);
        }
      }
      // Nestle slightly into the pile; once full, keep refreshing the top so
      // newly fallen leaves stay visible.
      base = Math.max(0, Math.min(base - 1, capAt(cx) - flatH));
      for (const [x, r, color] of pixels) {
        const row = base + r;
        if (row < 0 || row >= pileCap) continue;
        pile[row * w + x] = color + 1;
        if (row + 1 > heights[x]!) heights[x] = row + 1;
        paintPileCell(x, row);
      }
    };

    let lastTime = 0;

    const step = (time: number) => {
      const dt = lastTime ? Math.min(64, time - lastTime) : 16;
      lastTime = time;
      const k = dt / 16; // normalise to ~60fps units

      // Let the breeze decay.
      pointerVX *= 0.9;

      for (let i = 0; i < leaves.length; i++) {
        const leaf = leaves[i]!;
        const sway = Math.sin(time * leaf.swayFreq + leaf.swayPhase);

        // Pointer breeze: nudge leaves near the cursor along its motion and
        // slightly away from it.
        if (interactive && pointerX >= 0) {
          const dx = leaf.x - pointerX;
          const dy = leaf.y - pointerY;
          const d2 = dx * dx + dy * dy;
          if (d2 < 400) {
            const f = 1 - d2 / 400;
            const d = Math.sqrt(d2) || 1;
            leaf.vx += (pointerVX * 0.04 + (dx / d) * 0.05) * f;
            leaf.spinSpeed = Math.min(0.006, leaf.spinSpeed + 0.0002 * f);
          }
        }
        leaf.vx *= 0.96;

        leaf.x += (sway * leaf.swayAmp + leaf.vx) * k;
        leaf.y += leaf.vy * k * (0.85 + 0.15 * Math.abs(sway));
        leaf.spin += leaf.spinSpeed * dt;
        // Relax spin speed back toward calm.
        leaf.spinSpeed += (0.0012 - leaf.spinSpeed) * 0.002 * k;

        if (leaf.x < -15 || leaf.x > w + 15) {
          leaves[i] = spawn(false);
          continue;
        }

        const col = Math.min(w - 1, Math.max(0, Math.round(leaf.x)));
        if (leafBottom(leaf) <= heights[col]!) {
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
