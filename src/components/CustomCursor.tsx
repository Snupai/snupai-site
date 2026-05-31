'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A bold, glowing custom cursor for the home page.
 *
 * - A bright dot tracks the pointer exactly.
 * - A larger ring trails behind with noticeable easing for a fluid feel.
 * - The ring grows and turns pink when hovering interactive elements.
 * - Clicking emits a quick expanding pulse.
 *
 * Disabled on touch devices and when the user prefers reduced motion.
 */
export default function CustomCursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;

    if (prefersReducedMotion || !isFinePointer) return;
    setEnabled(true);
    document.documentElement.classList.add('cursor-none-root');

    const ring = ringRef.current;
    const dot = dotRef.current;
    const pulse = pulseRef.current;
    if (!ring || !dot || !pulse) return;

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

    const onDown = (e: PointerEvent) => {
      // Restart the pulse animation at the click point.
      pulse.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
      pulse.classList.remove('cursor-pulse-run');
      // Force reflow so the animation can replay.
      void pulse.offsetWidth;
      pulse.classList.add('cursor-pulse-run');
    };

    let frameId = 0;
    const loop = () => {
      // Lower factor => more lag => a clearly visible trailing motion.
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      frameId = requestAnimationFrame(loop);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    frameId = requestAnimationFrame(loop);

    return () => {
      document.documentElement.classList.remove('cursor-none-root');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(frameId);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] hidden md:block">
      {/* Trailing ring */}
      <div
        ref={ringRef}
        data-hover="false"
        className="cursor-ring absolute left-0 top-0 h-9 w-9 rounded-full border-2 border-mocha-lavender opacity-0 transition-[width,height,border-color,background-color] duration-200 ease-out data-[hover=true]:h-14 data-[hover=true]:w-14 data-[hover=true]:border-mocha-pink data-[hover=true]:bg-mocha-lavender-soft"
      />
      {/* Exact-tracking dot */}
      <div
        ref={dotRef}
        className="cursor-dot absolute left-0 top-0 h-2.5 w-2.5 rounded-full bg-mocha-lavender opacity-0"
      />
      {/* Click pulse */}
      <div
        ref={pulseRef}
        className="absolute left-0 top-0 h-9 w-9 rounded-full border-2 border-mocha-pink opacity-0"
      />
    </div>
  );
}
