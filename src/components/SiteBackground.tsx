import { env } from "~/env";
import AsciiWave from "~/components/AsciiWave";
import FallingLeaves from "~/components/FallingLeaves";

/**
 * Site-wide ambient layer.
 *
 * Renders a calm animated field as a fixed, full-viewport backdrop that sits
 * behind every page (below in-flow content via a negative z-index). Because it
 * lives in the root layout, the same animation applies across all routes.
 *
 * The variant is chosen by the `SITE_BACKGROUND` env var:
 *   - "leaves" (default): pixel-art falling autumn leaves
 *   - "rain": ASCII matrix-style rain
 */
export default function SiteBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 flex items-center justify-center"
    >
      {env.SITE_BACKGROUND === "rain" ? (
        <AsciiWave className="h-full w-full text-[0.6rem] leading-[0.9rem] text-mocha-sapphire opacity-[0.38] [filter:drop-shadow(0_0_6px_rgba(137,220,235,0.35))] [mask-image:radial-gradient(ellipse_75%_75%_at_50%_45%,black,transparent_92%)] sm:text-[0.72rem]" />
      ) : (
        <FallingLeaves className="h-full w-full opacity-[0.45] [filter:drop-shadow(0_0_4px_rgba(250,179,135,0.25))] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_45%,black,transparent_95%)]" />
      )}
    </div>
  );
}
