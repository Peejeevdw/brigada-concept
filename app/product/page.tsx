import Product from "@/views/Product";
import { getService } from "@/lib/sanity-fetch";
import type { PillarService } from "@/views/pillar-types";

export default async function ProductPage() {
  const data = await getService("product");
  return <Product service={(data?.service as PillarService | null) ?? null} />;
}
