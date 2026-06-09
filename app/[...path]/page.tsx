import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Landing, { type LandingData } from "@/views/Landing";
import { getLandingPage } from "@/lib/sanity-fetch";

/**
 * Catch-all route — fires only when no other route in the tree matches. The
 * matched segments are joined back into a path (`["press", "launch"]` →
 * `"press/launch"`) and looked up against `landingPage.slug.current`. If
 * nothing matches we hand off to the global 404. New landing pages don't
 * need a code change: the editor just sets the URL path in Sanity.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ path: string[] }>;
}): Promise<Metadata> {
  const { path } = await params;
  const slug = path.join("/");
  const data = (await getLandingPage(slug)) as LandingData;
  if (!data) return {};
  const title = data.seo?.title || data.title || undefined;
  const description = data.seo?.description || undefined;
  const ogImage = data.seo?.image?.asset?.url;
  return {
    title,
    description,
    robots: data.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
  };
}

export default async function LandingRoute({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  const slug = path.join("/");
  const data = (await getLandingPage(slug)) as LandingData;
  if (!data) notFound();
  return <Landing data={data} />;
}
