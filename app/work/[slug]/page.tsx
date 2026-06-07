import WorkDetail, { type WorkDocData } from "@/views/WorkDetail";
import CaseLayout, { type WorkLayoutData } from "@/views/CaseLayout";
import { getWork, getWorkSlugs } from "@/lib/sanity-fetch";

// Prerender every case at build time so /work/[slug] is static + ISR instead
// of server-rendered on demand — this is what makes navigating into a case
// near-instant. New slugs not built yet are rendered on first request and
// cached (dynamicParams defaults to true); draft mode still bypasses to a
// fresh dynamic render for editor preview.
export async function generateStaticParams() {
  const slugs = await getWorkSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function WorkDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const work = (await getWork(slug)) as (WorkDocData & WorkLayoutData) | null;

  // Use the new case layout once an editor has filled in any of its fields;
  // otherwise keep the original WorkDetail so un-migrated cases stay intact.
  const hasNewLayout = !!(
    work?.hero ||
    (work?.mediaRows && work.mediaRows.length > 0) ||
    (work?.projectInfo?.sections && work.projectInfo.sections.length > 0)
  );

  return hasNewLayout ? (
    <CaseLayout data={work as WorkLayoutData} />
  ) : (
    <WorkDetail work={work} />
  );
}
