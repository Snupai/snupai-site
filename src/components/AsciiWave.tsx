'use client';

import { useEffect, useRef } from 'react';

// Density ramp from "empty" to "dense". Calm, soft gradient of characters.
const RAMP = ' ·.:-=+*#%@';

interface AsciiWaveProps {
  className?: string;
  /** Multiplier for how strongly the pointer disturbs the field. */
  interactive?: boolean;
}

/**
 * A calm, interactive ASCII wave-field.
 *
 * A grid of monospace glyphs whose density is driven by a few overlapping
 * sine waves, producing slow, meditative ripples. The pointer adds a soft
 * radial swell that follows the cursor, so the field feels alive without
 * being noisy. The grid adapts to its container, throttles to a low frame
 * rate, pauses off-screen, and respects prefers-reduced-motion.
 */
export default function AsciiWave({ className, interactive = true }: AsciiWaveProps) {
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const pre = preRef.current;
    if (!pre) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const CELL_W = 9;
    const CELL_H = 16;

    let cols = 0;
    let rows = 0;
    let width = 0;
    let height = 0;

    // Pointer position in grid coordinates (-1 means "no pointer").
    let pointerX = -1;
    let pointerY = -1;
    // Smoothed pointer influence (eases in/out).
    let influence = 0;

    const measure = () => {
      const rect = pre.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      cols = Math.max(12, Math.floor(rect.width / CELL_W));
      rows = Math.max(8, Math.floor(rect.height / CELL_H));
    };

    const render = (time: number) => {
      const t = time * 0.0004;
      const cx = cols / 2;
      const cy = rows / 2;

      // Ease the pointer influence toward its target (snappy in, gentle out).
      const target = pointerX >= 0 ? 1 : 0;
      influence += (target - influence) * 0.16;

      let out = '';

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const nx = (x - cx) * 0.18;
          const ny = (y - cy) * 0.32;
          const dist = Math.sqrt(nx * nx + ny * ny);

          let v =
            Math.sin(nx + t) +
            Math.sin(ny * 0.8 - t * 0.7) +
            Math.sin((nx + ny) * 0.5 + t * 0.5) +
            Math.sin(dist * 1.6 - t * 1.2);

          // Pointer ripple: a travelling wave radiating from the cursor.
          // Wider reach and stronger amplitude so it reads clearly.
          if (influence > 0.001 && pointerX >= 0) {
            const dx = (x - pointerX) * 0.16;
            const dy = (y - pointerY) * 0.28;
            const pd = Math.sqrt(dx * dx + dy * dy);
            const ripple = Math.sin(pd * 2.0 - time * 0.008) * Math.exp(-pd * 0.18);
            // A bright swell right under the cursor plus the radiating ripple.
            const swell = Math.exp(-pd * pd * 0.5) * 2.2;
            v += (ripple * 4.2 + swell) * influence;
          }

          // Map from [-4, 4]-ish to [0, 1].
          const n = (v + 4) / 8;
          const idx = Math.min(
            RAMP.length - 1,
            Math.max(0, Math.floor(n * (RAMP.length - 1))),
          );
          out += RAMP[idx];
        }
        out += '\n';
      }

      pre.textContent = out;
    };

    let frameId = 0;
    let lastFrame = 0;
    let running = true;
    const FRAME_INTERVAL = 1000 / 30; // ~30fps, smooth and responsive to pointer

    const loop = (time: number) => {
      if (!running) return;
      if (time - lastFrame >= FRAME_INTERVAL) {
        lastFrame = time;
        render(time);
      }
      frameId = requestAnimationFrame(loop);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!interactive || prefersReducedMotion) return;
      const rect = pre.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / width;
      const relY = (e.clientY - rect.top) / height;
      pointerX = relX * cols;
      pointerY = relY * rows;
    };

    const onPointerLeave = () => {
      pointerX = -1;
      pointerY = -1;
    };

    measure();

    if (prefersReducedMotion) {
      render(0);
    } else {
      frameId = requestAnimationFrame(loop);
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerdown', onPointerMove, { passive: true });
      document.addEventListener('pointerleave', onPointerLeave);
    }

    const resizeObserver = new ResizeObserver(() => {
      measure();
      if (prefersReducedMotion) render(0);
    });
    resizeObserver.observe(pre);

    const visObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting && !prefersReducedMotion) {
          if (!running) {
            running = true;
            frameId = requestAnimationFrame(loop);
          }
        } else {
          running = false;
          cancelAnimationFrame(frameId);
        }
      },
      { threshold: 0 },
    );
    visObserver.observe(pre);

    return () => {
      running = false;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      visObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerMove);
      document.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [interactive]);

  return (
    <pre
      ref={preRef}
      aria-hidden="true"
      className={`pointer-events-none select-none overflow-hidden whitespace-pre font-mono leading-[1rem] tracking-[0.15em] ${className ?? ''}`}
    />
  );
}
