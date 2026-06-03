import Expertise, { type ExpertiseOverviewData } from "@/views/Expertise";
import { getExpertiseIndex } from "@/lib/sanity-fetch";

export default async function ExpertisePage() {
  const data = (await getExpertiseIndex()) as ExpertiseOverviewData | null;
  return <Expertise data={data} />;
}
