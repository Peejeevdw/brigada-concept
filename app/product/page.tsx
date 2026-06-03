import Product from "@/views/Product";
import { getExpertise } from "@/lib/sanity-fetch";
import type { PillarExpertise } from "@/views/pillar-types";

export default async function ProductPage() {
  const data = await getExpertise("product");
  return <Product expertise={(data?.expertise as PillarExpertise | null) ?? null} />;
}
