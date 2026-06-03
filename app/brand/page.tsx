import Brand from "@/views/Brand";
import { getExpertise } from "@/lib/sanity-fetch";
import type { PillarExpertise } from "@/views/pillar-types";

export default async function BrandPage() {
  const data = await getExpertise("brand");
  return <Brand expertise={(data?.expertise as PillarExpertise | null) ?? null} />;
}
