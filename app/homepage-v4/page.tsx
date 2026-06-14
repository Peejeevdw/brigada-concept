import ConceptV4, {
  type ConceptData,
  type ConceptPressHero,
} from "@/views/ConceptV4";
import { getHomePage, getPressRelease } from "@/lib/sanity-fetch";

/**
 * /homepage-v4 — a homepage variant, started as a copy of v3. The canonical
 * homepage stays at "/" (src/views/Concept); each variant has its own view +
 * route so they can diverge independently.
 */
export default async function HomepageV4() {
  const [data, press] = await Promise.all([
    getHomePage() as Promise<ConceptData | null>,
    getPressRelease("launch") as Promise<{ heroMedia?: ConceptPressHero } | null>,
  ]);
  return <ConceptV4 data={data} pressHero={press?.heroMedia ?? null} />;
}
