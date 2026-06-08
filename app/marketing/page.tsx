import Marketing from "@/views/Marketing";
import { getServiceCategory } from "@/lib/sanity-fetch";
import type { ServiceCategoryDoc } from "@/views/pillar-types";

export default async function MarketingPage() {
  const data = await getServiceCategory("marketing");
  return <Marketing category={(data?.category as ServiceCategoryDoc | null) ?? null} />;
}
