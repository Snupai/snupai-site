'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * A bold, glowing custom cursor for the home page.
 *
 * - A bright dot tracks the pointer exactly.
 * - A larger ring trails behind with noticeable easing for a fluid feel.
 * - The ring grows and turns pink over interactive elements.
 * - Clicking emits a quick expanding pulse.
 *
 * Rendered through a portal on <body> with a very high z-index so it always
 * sits above every page layer. Disabled on touch / reduced-motion devices.
 */
export default function CustomCursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setMounted(true);

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;

    if (prefersReducedMotion || !isFinePointer) return;
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;

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

    const show = () => {
      if (visible) return;
      visible = true;
      ring.style.opacity = '1';
      dot.style.opacity = '1';
    };

    const onMove = (e: PointerEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      show();
      dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;

      const target = e.target as HTMLElement | null;
      const isInteractive = !!target?.closest(
        'a, button, input, textarea, select, label, summary, [role="button"], [data-cursor="hover"], .cursor-pointer, .title-highlight',
      );
      if (isInteractive !== hovering) {
        hovering = isInteractive;
        ring.dataset.hover = hovering ? 'true' : 'false';
      }
    };

    const onLeaveWindow = (e: PointerEvent) => {
      // Only hide when the pointer actually leaves the window.
      if (e.relatedTarget === null) {
        visible = false;
        ring.style.opacity = '0';
        dot.style.opacity = '0';
      }
    };

    const onDown = (e: PointerEvent) => {
      pulse.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
      pulse.classList.remove('cursor-pulse-run');
      void pulse.offsetWidth; // force reflow so the animation replays
      pulse.classList.add('cursor-pulse-run');
    };

    let frameId = 0;
    const loop = () => {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      frameId = requestAnimationFrame(loop);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerout', onLeaveWindow);
    frameId = requestAnimationFrame(loop);

    return () => {
      document.documentElement.classList.remove('cursor-none-root');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerout', onLeaveWindow);
      cancelAnimationFrame(frameId);
    };
  }, [enabled]);

  if (!mounted || !enabled) return null;

  return createPortal(
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[9999]">
      {/* Trailing ring */}
      <div
        ref={ringRef}
        data-hover="false"
        className="cursor-ring absolute left-0 top-0 h-9 w-9 rounded-full border-2 border-mocha-lavender opacity-0 transition-[width,height,border-color,background-color] duration-200 ease-out data-[hover=true]:h-14 data-[hover=true]:w-14 data-[hover=true]:border-mocha-pink data-[hover=true]:bg-mocha-lavender-soft"
      />
      {/* Exact-tracking dot */}
      <div
        ref={dotRef}
        className="cursor-dot absolute left-0 top-0 h-2.5 w-2.5 rounded-full opacity-0"
      />
      {/* Click pulse */}
      <div
        ref={pulseRef}
        className="absolute left-0 top-0 h-9 w-9 rounded-full border-2 border-mocha-pink opacity-0"
      />
    </div>,
    document.body,
  );
}
