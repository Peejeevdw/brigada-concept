import type { SVGProps } from "react";
import TodayLogo from "@/components/agency-logos/TodayLogo";

// "X is now Brigada" landing pages — the old agency sites redirect here, so the
// agency name lives in the URL (e.g. /today). Static for now; the shape mirrors
// what a future Sanity `oldAgency` document would hold, so swapping the lookup
// in app/[...path] for a Sanity fetch later is a drop-in change.
export type OldAgency = {
  /** URL slug — the whole path (today.be → /today). */
  slug: string;
  /** Display name, used for the page <title>. */
  name: string;
  /** Old agency wordmark. Renders in currentColor (white on the brio hero). */
  Logo: (props: SVGProps<SVGSVGElement>) => React.ReactElement;
  /** Paragraph shown in the black section. */
  body: string;
  /** Brio palette id for the hero background (see src/data/duotones.ts). */
  brioPaletteId: string;
};

export const OLD_AGENCIES: Record<string, OldAgency> = {
  today: {
    slug: "today",
    name: "Today",
    Logo: TodayLogo,
    body:
      "Today is entering a new chapter as Brigada. We remain devoted to giving brands a soul, a voice and a face, but now we’re part of an integrated agency that combines our expertise with the other key domains of marketing, product and people. The fight we picked? To cut through the noise and set brands in motion again.",
    brioPaletteId: "brio-05",
  },
};

export const getOldAgency = (slug: string): OldAgency | null =>
  OLD_AGENCIES[slug.toLowerCase()] ?? null;
