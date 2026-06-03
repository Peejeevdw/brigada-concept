import WorkDetail, { type WorkDocData } from "@/views/WorkDetail";
import { getWork } from "@/lib/sanity-fetch";

export default async function WorkDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const work = (await getWork(slug)) as WorkDocData | null;
  return <WorkDetail work={work} />;
}
