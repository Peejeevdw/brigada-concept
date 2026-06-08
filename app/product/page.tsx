import Product from "@/views/Product";
import { getServiceCategory } from "@/lib/sanity-fetch";
import type { ServiceCategoryDoc } from "@/views/pillar-types";

export default async function ProductPage() {
  const data = await getServiceCategory("product");
  return <Product category={(data?.category as ServiceCategoryDoc | null) ?? null} />;
}
