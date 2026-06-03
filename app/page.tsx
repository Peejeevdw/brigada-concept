import Concept, { type ConceptData } from "@/views/Concept";
import { getHomePage } from "@/lib/sanity-fetch";

export default async function HomePage() {
  const data = (await getHomePage()) as ConceptData | null;
  return <Concept data={data} />;
}
