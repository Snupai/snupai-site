import AsciiWave from "~/components/AsciiWave";

/**
 * Site-wide ambient layer.
 *
 * Renders the calm ASCII rain field as a fixed, full-viewport backdrop that
 * sits behind every page (below in-flow content via a negative z-index).
 * Because it lives in the root layout, the same gentle animation applies
 * consistently across all routes.
 */
export default function SiteBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 flex items-center justify-center"
    >
      <AsciiWave className="h-full w-full text-[0.6rem] leading-[0.9rem] text-mocha-lavender opacity-[0.38] [mask-image:radial-gradient(ellipse_75%_75%_at_50%_45%,black,transparent_92%)] sm:text-[0.72rem]" />
    </div>
  );
}
