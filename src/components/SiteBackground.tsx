import { env } from "~/env";
import { BACKGROUNDS } from "~/components/backgrounds";
import DynamicBackground from "~/components/DynamicBackground";

/**
 * Site-wide ambient layer.
 *
 * Renders a calm animated field as a fixed, full-viewport backdrop that sits
 * behind every page (below in-flow content via a negative z-index). Because it
 * lives in the root layout, the same animation applies across all routes.
 *
 * The variant is chosen by the `SITE_BACKGROUND` env var:
 *   - "leaves" (default): pixel-art falling autumn leaves that pile up at
 *     the bottom of the viewport over time
 *   - "rain": pixel-art rain with wind gusts, splashes and a puddle line
 *     that fills up on top of the footer
 *   - "snow": pixel-art snowfall that drifts into a pile on top of the footer
 *   - "dynamic": picks one of the above from the visitor's local date, using
 *     the table in `~/lib/seasonalBackground`
 */
export default function SiteBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 flex items-center justify-center"
    >
      {env.SITE_BACKGROUND === "dynamic" ? (
        <DynamicBackground />
      ) : (
        // Fall back to leaves when validation is skipped and the var is unset.
        (BACKGROUNDS[env.SITE_BACKGROUND] ?? BACKGROUNDS.leaves)()
      )}
    </div>
  );
}
