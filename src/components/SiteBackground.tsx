'use client';

import AsciiWave from "~/components/AsciiWave";
import { useAsciiBackground } from "~/components/ascii/AsciiBackgroundProvider";

/**
 * Site-wide ambient layer.
 *
 * Renders the calm ASCII field as a fixed, full-viewport backdrop that sits
 * behind every page (below in-flow content via a negative z-index). Because it
 * lives in the root layout, the same gentle animation applies consistently
 * across all routes. The active pattern comes from the shared background
 * context, so it can be switched at runtime without remounting anything else.
 */
export default function SiteBackground() {
  const { variant } = useAsciiBackground();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 flex items-center justify-center"
    >
      <AsciiWave
        variant={variant}
        className="h-full w-full text-[0.6rem] leading-[0.9rem] text-mocha-lavender opacity-[0.38] [mask-image:radial-gradient(ellipse_75%_75%_at_50%_45%,black,transparent_92%)] sm:text-[0.72rem]"
      />
    </div>
  );
}
