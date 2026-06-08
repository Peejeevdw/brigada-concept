import Services, { type ServicesOverviewData } from "@/views/Services";
import { getServicesIndex } from "@/lib/sanity-fetch";

export default async function ServicesPage() {
  const data = (await getServicesIndex()) as ServicesOverviewData | null;
  return <Services data={data} />;
}
