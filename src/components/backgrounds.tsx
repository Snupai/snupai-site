import FallingLeaves from "~/components/FallingLeaves";
import FallingRain from "~/components/FallingRain";
import FallingSnow from "~/components/FallingSnow";

// Every canvas stops at the fixed h-12 footer so piles, puddles and drifts
// rest on top of it instead of being hidden behind it.
const LAYER = "absolute inset-x-0 top-0 bottom-12 h-[calc(100%-3rem)] w-full";
const FADE_IN = "[mask-image:linear-gradient(to_bottom,transparent,black_18%)]";

/**
 * Every ambient background, by `SITE_BACKGROUND` key. Both the fixed modes and
 * `dynamic` render through this table, so a new background only needs an
 * entry here (plus its key in `src/env.js`).
 */
export const BACKGROUNDS = {
  leaves: () => (
    <FallingLeaves
      className={`${LAYER} opacity-[0.55] [filter:drop-shadow(0_0_4px_rgba(210,105,30,0.3))] ${FADE_IN}`}
    />
  ),
  rain: () => (
    <FallingRain
      className={`${LAYER} opacity-[0.7] [filter:drop-shadow(0_0_3px_rgba(137,220,235,0.3))] ${FADE_IN}`}
    />
  ),
  snow: () => (
    <FallingSnow
      className={`${LAYER} opacity-[0.6] [filter:drop-shadow(0_0_3px_rgba(205,225,255,0.35))] ${FADE_IN}`}
    />
  ),
} satisfies Record<string, () => React.ReactNode>;

export type BackgroundKey = keyof typeof BACKGROUNDS;
