import type { CascadingSlide } from "@/components/CascadingSlider";
import { thumbVideoMedia } from "@/components/case-media";
import { urlFor } from "@/lib/sanity";
import type { WorkListItem } from "./pillar-types";

// Shared mappers turning the `cases` array from getServiceCategory (real `work`
// docs linked to a service category) into the shapes the bottom "related cases"
// sections expect. Same recipe the case detail uses for its related slider
// (CaseLayout.tsx) so thumbnails, LQIP blur-up and video thumbnails behave
// identically. Client-only (urlFor + thumbVideoMedia) — import from the pillar
// views, not the server page.tsx wrappers.

// Cases → CascadingSlider slides (Product / People / Marketing). Each links to
// /work/:slug and carries an optional silent looping video thumbnail.
export function casesToSlides(cases: (WorkListItem | null)[] | null | undefined): CascadingSlide[] {
  return (cases ?? [])
    .map((rc): CascadingSlide | null => {
      if (!rc?.image) return null;
      const img = urlFor(rc.image)?.width(900).fit("max").quality(72).auto("format").url();
      if (!img) return null;
      return {
        img,
        title: rc.name ?? "",
        href: rc.slug ? `/work/${rc.slug}` : undefined,
        lqip: rc.lqip ?? undefined,
        video: thumbVideoMedia(rc, img),
      };
    })
    .filter((s): s is CascadingSlide => s !== null);
}

// One tile in the Brand orbit. Image-only (the orbit renders a plain <img>);
// `client` is the bottom-left label, `slug` makes the tile navigate to /work.
export type OrbitCase = { slug?: string; img: string; client?: string };

// Cases → Brand orbit tiles. Skips cases without an image.
export function casesToOrbit(cases: (WorkListItem | null)[] | null | undefined): OrbitCase[] {
  return (cases ?? [])
    .map((rc): OrbitCase | null => {
      if (!rc?.image) return null;
      const img = urlFor(rc.image)?.width(1200).fit("max").quality(72).auto("format").url();
      if (!img) return null;
      return {
        slug: rc.slug ?? undefined,
        img,
        client: rc.client ?? rc.name ?? undefined,
      };
    })
    .filter((c): c is OrbitCase => c !== null);
}
