'use client';

import { useEffect, useRef } from 'react';

/**
 * Leaf sprites on a tiny pixel grid.
 *   '1' = leaf body, '2' = vein / stem (darker shade), '.' = transparent.
 */
const SPRITES = [
  // maple
  [
    '...1...',
    '.1.1.1.',
    '1111111',
    '.11211.',
    '..121..',
    '...2...',
    '...2...',
  ],
  // oak / oval
  [
    '..11...',
    '.1111..',
    '111211.',
    '.11211.',
    '..1211.',
    '...11..',
    '....2..',
  ],
  // small birch
  [
    '.11..',
    '1111.',
    '11211',
    '.1121',
    '...12',
  ],
] as const;

/** Catppuccin Mocha autumn tones: [front body, vein, back-side body]. */
const PALETTES = [
  ['#f38ba8', '#b4637a', '#c9708a'], // red
  ['#fab387', '#c47f55', '#d6966c'], // peach
  ['#f9e2af', '#c9a96e', '#d9c18e'], // yellow
  ['#eba0ac', '#b9737f', '#c7868f'], // maroon
] as const;

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
 * darker back side mid-flip). The pointer acts as a light breeze. Throttled to
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

    // Pointer in art-pixel coordinates; smoothed velocity for the breeze.
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

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, Math.ceil(rect.width / PX));
      h = Math.max(1, Math.ceil(rect.height / PX));
      canvas.width = w;
      canvas.height = h;
      // Density scales with area, capped to stay calm on big screens.
      const target = Math.min(70, Math.max(14, Math.round((w * h) / 2600)));
      while (leaves.length < target) leaves.push(spawn(true));
      if (leaves.length > target) leaves = leaves.slice(0, target);
    };

    const drawLeaf = (leaf: Leaf) => {
      const sprite = SPRITES[leaf.sprite]!;
      const [front, vein, back] = PALETTES[leaf.palette]!;
      const size = sprite.length;
      const half = (size - 1) / 2;
      // Tumble: squash horizontally by cos(spin); flip to back side when < 0.
      const c = Math.cos(leaf.spin);
      const facingBack = c < 0;
      const scale = Math.abs(c) < 0.18 ? 0.18 : Math.abs(c);
      const cx = Math.round(leaf.x);
      const cy = Math.round(leaf.y);

      for (let sy = 0; sy < size; sy++) {
        const row = sprite[sy]!;
        for (let sx = 0; sx < size; sx++) {
          const ch = row[sx];
          if (ch === '.') continue;
          const srcX = facingBack ? size - 1 - sx : sx;
          const px = cx + Math.round((srcX - half) * scale);
          const py = cy + sy - Math.round(half);
          ctx.fillStyle = ch === '2' ? vein : facingBack ? back : front;
          ctx.fillRect(px, py, 1, 1);
        }
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

        if (leaf.y > h + 10 || leaf.x < -15 || leaf.x > w + 15) {
          leaves[i] = spawn(false);
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
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
      if (pointerX >= 0) {
        pointerVX += (nx - pointerX) * 0.5;
      }
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
