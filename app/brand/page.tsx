import Brand from "@/views/Brand";
import { getService } from "@/lib/sanity-fetch";
import type { PillarService } from "@/views/pillar-types";

export default async function BrandPage() {
  const data = await getService("brand");
  return <Brand service={(data?.service as PillarService | null) ?? null} />;
}
