import { env } from "~/env";
import FallingRain from "~/components/FallingRain";
import FallingLeaves from "~/components/FallingLeaves";
import FallingSnow from "~/components/FallingSnow";

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
 */
export default function SiteBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 flex items-center justify-center"
    >
      {env.SITE_BACKGROUND === "rain" ? (
        // Like the leaves, stop at the fixed h-12 footer so splashes and the
        // puddle land on top of it.
        <FallingRain className="absolute inset-x-0 top-0 bottom-12 h-[calc(100%-3rem)] w-full opacity-[0.7] [filter:drop-shadow(0_0_3px_rgba(137,220,235,0.3))] [mask-image:linear-gradient(to_bottom,transparent,black_18%)]" />
      ) : env.SITE_BACKGROUND === "snow" ? (
        // Like the leaves, stop at the fixed h-12 footer so the drift rests on it.
        <FallingSnow className="absolute inset-x-0 top-0 bottom-12 h-[calc(100%-3rem)] w-full opacity-[0.6] [filter:drop-shadow(0_0_3px_rgba(205,225,255,0.35))] [mask-image:linear-gradient(to_bottom,transparent,black_18%)]" />
      ) : (
        // Stop at the fixed h-12 footer so the leaf pile rests on top of it
        // instead of being hidden behind it.
        <FallingLeaves className="absolute inset-x-0 top-0 bottom-12 h-[calc(100%-3rem)] w-full opacity-[0.55] [filter:drop-shadow(0_0_4px_rgba(210,105,30,0.3))] [mask-image:linear-gradient(to_bottom,transparent,black_18%)]" />
      )}
    </div>
  );
}
