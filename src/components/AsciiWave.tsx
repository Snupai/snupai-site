'use client';

import { useEffect, useRef } from 'react';

// Density ramp from "empty" to "dense". Calm, soft gradient of characters.
const RAMP = ' ·.:-=+*#%@';

interface AsciiWaveProps {
  className?: string;
}

/**
 * A subtle, calm ASCII wave-field animation.
 *
 * Renders a grid of monospace characters whose density is driven by a few
 * overlapping sine waves, producing a slow, meditative rippling motion.
 * The grid size adapts to the container for full responsiveness, and the
 * animation is throttled and pauses when off-screen or when the user prefers
 * reduced motion.
 */
export default function AsciiWave({ className }: AsciiWaveProps) {
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const pre = preRef.current;
    if (!pre) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    // Character cell size in px (approx) used to compute grid dimensions.
    const CELL_W = 9;
    const CELL_H = 16;

    let cols = 0;
    let rows = 0;

    const measure = () => {
      const rect = pre.getBoundingClientRect();
      cols = Math.max(12, Math.floor(rect.width / CELL_W));
      rows = Math.max(8, Math.floor(rect.height / CELL_H));
    };

    const render = (time: number) => {
      const t = time * 0.0004;
      const cx = cols / 2;
      const cy = rows / 2;
      let out = '';

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          // Normalize coordinates (account for character aspect ratio).
          const nx = (x - cx) * 0.18;
          const ny = (y - cy) * 0.32;
          const dist = Math.sqrt(nx * nx + ny * ny);

          const v =
            Math.sin(nx + t) +
            Math.sin(ny * 0.8 - t * 0.7) +
            Math.sin((nx + ny) * 0.5 + t * 0.5) +
            Math.sin(dist * 1.6 - t * 1.2);

          // Map from [-4, 4] to [0, 1].
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
    const FRAME_INTERVAL = 1000 / 18; // ~18fps for a calm, gentle motion

    const loop = (time: number) => {
      if (!running) return;
      if (time - lastFrame >= FRAME_INTERVAL) {
        lastFrame = time;
        render(time);
      }
      frameId = requestAnimationFrame(loop);
    };

    measure();

    if (prefersReducedMotion) {
      // Draw a single static frame and stop.
      render(0);
    } else {
      frameId = requestAnimationFrame(loop);
    }

    const resizeObserver = new ResizeObserver(() => {
      measure();
      if (prefersReducedMotion) render(0);
    });
    resizeObserver.observe(pre);

    // Pause when the tab/section is not visible to save resources.
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
    };
  }, []);

  return (
    <pre
      ref={preRef}
      aria-hidden="true"
      className={`pointer-events-none select-none overflow-hidden whitespace-pre font-mono leading-[1rem] tracking-[0.15em] ${className ?? ''}`}
    />
  );
}
