import JobDetail, { type JobData } from "@/views/JobDetail";
import { getJob, getJobSlugs } from "@/lib/sanity-fetch";

// Prerender every job at build time so /careers/jobs/[slug] is static + ISR
// rather than server-rendered on demand. New slugs render on first request and
// cache (dynamicParams defaults to true); draft mode still bypasses for preview.
export async function generateStaticParams() {
  const slugs = await getJobSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const job = (await getJob(slug)) as JobData | null;
  return <JobDetail job={job} />;
}
