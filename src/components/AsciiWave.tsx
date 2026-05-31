'use client';

import { useEffect, useRef } from 'react';

// Density ramp from "empty" to "dense". Calm, soft gradient of characters.
const RAMP = ' ·.:-=+*#%@';

const fract = (n: number) => n - Math.floor(n);
// Cheap deterministic per-column pseudo-randomness (no allocations).
const rand = (n: number) => fract(Math.sin(n * 127.1) * 43758.5453);

/**
 * Soft matrix-style rain field: per-column drops falling at varied speeds.
 * Maps a grid cell + time to a density value in roughly [0, 1].
 */
function rainField(x: number, y: number, rows: number, time: number) {
  const t = time * 0.004;
  const seed = rand(x + 1);
  const speed = 3 + seed * 7;
  const span = rows + 12;
  const head = (t * speed + seed * span) % span;
  const rel = head - y; // > 0 => cell is in the trailing tail above the head
  if (rel < -1) return 0;
  if (rel < 0) return 0.95; // bright leading head
  return Math.max(0, 0.85 - rel * 0.12); // fading tail
}

interface AsciiWaveProps {
  className?: string;
  /** Multiplier for how strongly the pointer disturbs the field. */
  interactive?: boolean;
}

/**
 * A calm, interactive ASCII rain renderer.
 *
 * A grid of monospace glyphs whose density is driven by a soft matrix-rain
 * field. The pointer adds a soft radial swell that follows the cursor, so the
 * field feels alive without being noisy. The grid adapts to its container,
 * throttles to a low frame rate, pauses off-screen, respects
 * prefers-reduced-motion, and never causes layout shift.
 */
export default function AsciiWave({
  className,
  interactive = true,
}: AsciiWaveProps) {
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
    // Actual rendered glyph advance/line height (measured, not assumed) so the
    // pointer maps to the correct character cell regardless of font size or
    // letter-spacing.
    let cellW = CELL_W;
    let cellH = CELL_H;

    // Pointer position in grid coordinates (-1 means "no pointer").
    let pointerX = -1;
    let pointerY = -1;
    // Smoothed pointer influence (eases in/out).
    let influence = 0;

    const measure = () => {
      const rect = pre.getBoundingClientRect();
      width = rect.width;
      height = rect.height;

      // Measure the true per-character advance using a probe that inherits the
      // pre's font and letter-spacing. This keeps grid coordinates aligned with
      // what's actually painted (fixes pointer drift on the x-axis).
      const cs = getComputedStyle(pre);
      const probe = document.createElement('span');
      probe.style.position = 'absolute';
      probe.style.visibility = 'hidden';
      probe.style.whiteSpace = 'pre';
      probe.style.fontFamily = cs.fontFamily;
      probe.style.fontSize = cs.fontSize;
      probe.style.fontWeight = cs.fontWeight;
      probe.style.letterSpacing = cs.letterSpacing;
      probe.style.lineHeight = cs.lineHeight;
      const SAMPLE = 64;
      probe.textContent = 'M'.repeat(SAMPLE);
      pre.parentElement?.appendChild(probe);
      const measuredW = probe.getBoundingClientRect().width / SAMPLE;
      probe.remove();
      cellW = measuredW > 0 ? measuredW : CELL_W;
      const lh = parseFloat(cs.lineHeight);
      cellH = Number.isFinite(lh) && lh > 0 ? lh : CELL_H;

      cols = Math.max(12, Math.floor(width / cellW));
      rows = Math.max(8, Math.floor(height / cellH));
    };

    const render = (time: number) => {
      // Ease the pointer influence toward its target. Gentle on both ends so
      // the cursor's effect feels like a soft breath rather than a splash.
      const target = pointerX >= 0 ? 1 : 0;
      influence += (target - influence) * 0.06;

      let out = '';

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          let n = rainField(x, y, rows, time);

          // Pointer interaction: a barely-there glow that very gently lifts
          // the rain in the few cells immediately around the cursor. Tiny
          // radius and low amplitude keep it whisper-subtle; aspect-corrected
          // so it stays circular despite tall character cells.
          if (influence > 0.001 && pointerX >= 0) {
            const aspect = cellH / cellW; // cells are taller than wide
            const dx = x - pointerX;
            const dy = (y - pointerY) * aspect;
            const dist2 = dx * dx + dy * dy;
            // Small, soft glow confined to within ~3 cells of the cursor.
            const glow = Math.exp(-dist2 * 0.09);
            n += glow * influence * 0.18;
          }

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
