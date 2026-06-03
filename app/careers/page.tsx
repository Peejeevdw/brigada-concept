import Careers, { type CareersData } from "@/views/Careers";
import { getCareersPage } from "@/lib/sanity-fetch";

export default async function CareersPage() {
  const data = (await getCareersPage()) as CareersData | null;
  return <Careers data={data} />;
}
