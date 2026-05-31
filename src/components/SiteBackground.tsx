'use client';

import AsciiWave from "~/components/AsciiWave";
import CustomCursor from "~/components/CustomCursor";

/**
 * Site-wide ambient layer.
 *
 * Renders the calm ASCII wave-field as a fixed, full-viewport backdrop that
 * sits behind every page (below in-flow content via a negative z-index), plus
 * the custom cursor. Because it lives in the root layout, the same gentle
 * animation and cursor interaction apply consistently across all routes.
 */
export default function SiteBackground() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 flex items-center justify-center"
      >
        <AsciiWave className="h-full w-full text-[0.6rem] leading-[0.9rem] text-mocha-overlay-1 opacity-[0.16] [mask-image:radial-gradient(ellipse_72%_72%_at_50%_45%,black,transparent_88%)] sm:text-[0.72rem]" />
      </div>
      <CustomCursor />
    </>
  );
}
