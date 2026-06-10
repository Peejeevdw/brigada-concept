import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PressRelease, { type PressReleaseData } from "@/views/PressRelease";
import Landing, { type LandingData } from "@/views/Landing";
import { getPressRelease, getPressReleaseSlugs, getLandingPage } from "@/lib/sanity-fetch";

/**
 * /press/[slug] — renders a `pressRelease` document when one matches the slug.
 * Falls back to a `landingPage` at `press/<slug>` so legacy press landing
 * pages (e.g. press/launch-clients) keep working, then to a 404.
 *
 * Press releases are prerendered at build time; unlisted slugs (and the
 * landingPage fallbacks) render on demand and cache (dynamicParams default).
 */
export async function generateStaticParams() {
  const slugs = await getPressReleaseSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const press = (await getPressRelease(slug)) as PressReleaseData;
  if (press) {
    const title = press.seo?.title || press.title || undefined;
    return {
      title,
      description: press.seo?.description || undefined,
      robots: press.noindex ? { index: false, follow: false } : undefined,
      openGraph: {
        title,
        description: press.seo?.description || undefined,
        images: press.seo?.image?.asset?.url
          ? [{ url: press.seo.image.asset.url }]
          : press.heroImage?.asset?.url
            ? [{ url: press.heroImage.asset.url }]
            : undefined,
      },
    };
  }

  const landing = (await getLandingPage(`press/${slug}`)) as LandingData;
  if (!landing) return {};
  const title = landing.seo?.title || landing.title || undefined;
  return {
    title,
    description: landing.seo?.description || undefined,
    robots: landing.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description: landing.seo?.description || undefined,
      images: landing.seo?.image?.asset?.url
        ? [{ url: landing.seo.image.asset.url }]
        : undefined,
    },
  };
}

export default async function PressRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const press = (await getPressRelease(slug)) as PressReleaseData;
  if (press) return <PressRelease data={press} />;

  // Fallback: a legacy press landing page at press/<slug>.
  const landing = (await getLandingPage(`press/${slug}`)) as LandingData;
  if (landing) return <Landing data={landing} />;

  notFound();
}
