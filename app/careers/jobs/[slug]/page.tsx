import JobDetail, { type JobData } from "@/views/JobDetail";
import { getJob } from "@/lib/sanity-fetch";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const job = (await getJob(slug)) as JobData | null;
  return <JobDetail job={job} />;
}
