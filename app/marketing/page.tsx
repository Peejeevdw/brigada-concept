import Marketing from "@/views/Marketing";
import { getExpertise } from "@/lib/sanity-fetch";
import type { PillarExpertise } from "@/views/pillar-types";

export default async function MarketingPage() {
  const data = await getExpertise("marketing");
  return <Marketing expertise={(data?.expertise as PillarExpertise | null) ?? null} />;
}
