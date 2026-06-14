import ConceptV2, {
  type ConceptData,
  type ConceptPressHero,
} from "@/views/ConceptV2";
import { getHomePage, getPressRelease } from "@/lib/sanity-fetch";

/**
 * /homepage-v2 — a variant of the homepage. The canonical homepage stays at "/"
 * (src/views/Concept). Each new variant gets its own view + route
 * (ConceptV3 → /homepage-v3, …) so they can diverge independently.
 */
export default async function HomepageV2() {
  const [data, press] = await Promise.all([
    getHomePage() as Promise<ConceptData | null>,
    getPressRelease("launch") as Promise<{ heroMedia?: ConceptPressHero } | null>,
  ]);
  return <ConceptV2 data={data} pressHero={press?.heroMedia ?? null} />;
}
