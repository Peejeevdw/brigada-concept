import People from "@/views/People";
import { getExpertise } from "@/lib/sanity-fetch";
import type { PillarExpertise } from "@/views/pillar-types";

export default async function PeoplePage() {
  const data = await getExpertise("people");
  return <People expertise={(data?.expertise as PillarExpertise | null) ?? null} />;
}
