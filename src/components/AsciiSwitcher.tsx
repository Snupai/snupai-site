"use client";

import { useAsciiBackground } from "~/components/ascii/AsciiBackgroundProvider";
import { ASCII_VARIANTS } from "~/components/ascii/variants";

/**
 * Subtle control to switch the ambient ASCII background between variants.
 *
 * Clicking cycles to the next pattern; the current label is shown for context.
 * Kept intentionally tiny and low-contrast so it reads as an optional toggle
 * rather than a new UI section, matching the rest of the footer chrome.
 */
export default function AsciiSwitcher() {
  const { variant, cycleVariant } = useAsciiBackground();

  const current =
    ASCII_VARIANTS.find((v) => v.key === variant)?.label ?? "Waves";

  return (
    <button
      type="button"
      onClick={cycleVariant}
      title={`Background: ${current} (click to change)`}
      aria-label={`Change background animation. Current: ${current}`}
      className="flex items-center gap-1.5 rounded-full border border-mocha-surface/60 bg-transparent px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-[0.15em] text-mocha-overlay1 transition-colors hover:border-mocha-lavender hover:text-mocha-lavender"
    >
      <span aria-hidden="true" className="text-mocha-lavender">
        {"\u2248"}
      </span>
      <span className="hidden sm:inline">{current}</span>
    </button>
  );
}
