import ConceptV3, {
  type ConceptData,
  type ConceptPressHero,
} from "@/views/ConceptV3";
import { getHomePage, getPressRelease } from "@/lib/sanity-fetch";

/**
 * /homepage-v3 — a homepage variant, started as a copy of v2. The canonical
 * homepage stays at "/" (src/views/Concept); each variant has its own view +
 * route so they can diverge independently.
 */
export default async function HomepageV3() {
  const [data, press] = await Promise.all([
    getHomePage() as Promise<ConceptData | null>,
    getPressRelease("launch") as Promise<{ heroMedia?: ConceptPressHero } | null>,
  ]);
  return <ConceptV3 data={data} pressHero={press?.heroMedia ?? null} />;
}
