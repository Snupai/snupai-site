'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A subtle custom cursor for the home page.
 *
 * - A small solid dot tracks the pointer exactly.
 * - A larger ring trails behind with easing for a calm, fluid feel.
 * - The ring grows and brightens when hovering interactive elements.
 *
 * Disabled on touch devices and when the user prefers reduced motion.
 */
export default function CustomCursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;

    if (prefersReducedMotion || !isFinePointer) return;
    setEnabled(true);

    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!ring || !dot) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let hovering = false;
    let visible = false;

    const onMove = (e: PointerEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!visible) {
        visible = true;
        ring.style.opacity = '1';
        dot.style.opacity = '1';
      }
      dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;

      const target = e.target as HTMLElement | null;
      const isInteractive = !!target?.closest(
        'a, button, input, textarea, select, [role="button"], [data-cursor="hover"]',
      );
      if (isInteractive !== hovering) {
        hovering = isInteractive;
        ring.dataset.hover = hovering ? 'true' : 'false';
      }
    };

    const onLeave = () => {
      visible = false;
      ring.style.opacity = '0';
      dot.style.opacity = '0';
    };

    let frameId = 0;
    const loop = () => {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      frameId = requestAnimationFrame(loop);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    frameId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(frameId);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 hidden md:block">
      <div
        ref={ringRef}
        data-hover="false"
        className="absolute left-0 top-0 h-8 w-8 rounded-full border border-mocha-lavender opacity-0 transition-[width,height,background-color,border-color,opacity] duration-200 ease-out data-[hover=true]:h-12 data-[hover=true]:w-12 data-[hover=true]:border-mocha-pink data-[hover=true]:bg-mocha-lavender-soft"
      />
      <div
        ref={dotRef}
        className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-mocha-lavender opacity-0 transition-opacity duration-200"
      />
    </div>
  );
}
