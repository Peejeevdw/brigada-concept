import Brand from "@/views/Brand";
import { getServiceCategory } from "@/lib/sanity-fetch";
import type { ServiceCategoryDoc } from "@/views/pillar-types";

export default async function BrandPage() {
  const data = await getServiceCategory("brand");
  return <Brand category={(data?.category as ServiceCategoryDoc | null) ?? null} />;
}
