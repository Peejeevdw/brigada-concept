import Marketing from "@/views/Marketing";
import { getService } from "@/lib/sanity-fetch";
import type { PillarService } from "@/views/pillar-types";

export default async function MarketingPage() {
  const data = await getService("marketing");
  return <Marketing service={(data?.service as PillarService | null) ?? null} />;
}
