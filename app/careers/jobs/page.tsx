import Jobs from "@/views/Jobs";
import { getJobs } from "@/lib/sanity-fetch";

export default async function JobsPage() {
  const jobs = (await getJobs()) ?? [];
  return <Jobs jobs={jobs} />;
}
