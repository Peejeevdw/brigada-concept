import "server-only";
import { draftMode } from "next/headers";
import { createClient } from "@sanity/client";
import groq from "groq";
import {
  DEFAULT_SANITY_LOCALE,
  SANITY_API_VERSION,
  SANITY_DATASET,
  SANITY_PROJECT_ID,
  SANITY_STUDIO_URL,
  SANITY_VIEWER_TOKEN,
  sanityClient,
} from "./sanity";

/**
 * Stega-enabled client used when Next.js Draft Mode is active. Reads the
 * `previewDrafts` perspective and embeds invisible field paths into string
 * values so the FE can light up Sanity's Visual Editing overlay.
 */
const draftClient = SANITY_PROJECT_ID
  ? createClient({
      projectId: SANITY_PROJECT_ID,
      dataset: SANITY_DATASET,
      apiVersion: SANITY_API_VERSION,
      useCdn: false,
      perspective: "previewDrafts",
      token: SANITY_VIEWER_TOKEN || undefined,
      stega: { studioUrl: SANITY_STUDIO_URL, enabled: true },
    })
  : null;

// Time-based backstop for the published data cache (seconds). The Sanity
// webhook → /api/revalidate busts the "sanity" tag instantly on edits; this
// just guarantees freshness if a webhook delivery is ever missed.
const SANITY_CACHE_REVALIDATE_S = 3600;

/**
 * Server-side GROQ wrapper. Falls back to the published client when Draft
 * Mode is off; otherwise uses the draft client with stega encoding so query
 * results can be clicked through to their Studio fields.
 */
async function fetch<T>(
  query: string,
  params: Record<string, unknown> = {},
  tags: string[] = [],
): Promise<T | null> {
  const isDraft = (await draftMode()).isEnabled;
  const client = isDraft && draftClient ? draftClient : sanityClient;
  if (!client) return null;
  try {
    return await client.fetch<T>(query, params, {
      // In production we cache by tag so the /api/revalidate webhook can bust
      // the affected pages instantly on a Sanity edit. `revalidate` is a
      // time-based backstop in case the webhook ever misses. In dev we always
      // bypass the cache so editor changes show on the next request.
      ...(process.env.NODE_ENV === "production"
        ? { next: { tags: ["sanity", ...tags], revalidate: SANITY_CACHE_REVALIDATE_S } }
        : { cache: "no-store" as const }),
    });
  } catch (error) {
    console.error("Sanity query failed:", error);
    return null;
  }
}

// ---------- Common projections ----------

const I18N_STRING = `coalesce(
  value[_key == $locale][0].value,
  value[_key == "en"][0].value,
  value[0].value
)`;

/**
 * Resolves the `internal` reference on a `link` object to a URL. Each new
 * linkable document type needs a matching `select()` case here.
 */
const INTERNAL_URL = `select(
  internal->_type == "homePage" => "/",
  internal->_type == "workIndexPage" => "/work",
  internal->_type == "expertiseIndexPage" => "/expertise",
  internal->_type == "aboutPage" => "/about",
  internal->_type == "careersPage" => "/careers",
  internal->_type == "contactPage" => "/contact",
  internal->_type == "legalPage" && internal->kind == "privacy" => "/privacy",
  internal->_type == "legalPage" && internal->kind == "cookies" => "/cookies",
  internal->_type == "legalPage" && internal->kind == "terms" => "/terms",
  internal->_type == "legalPage" && internal->kind == "imprint" => "/imprint",
  internal->_type == "work" => "/work/" + internal->slug.current,
  internal->_type == "expertise" => "/" + internal->slug.current,
  internal->_type == "job" => "/careers/jobs/" + internal->slug.current
)`;

/**
 * Projects a unified `link` object into the shape the FE expects:
 * `{ _key, label, url, openInNewTab }`. Handles all five `target` modes —
 * internal page references, external URLs, mailto, tel, anchors.
 */
const LINK_PROJECTION = `{
  _key,
  "label": coalesce(label[_key == $locale][0].value, label[_key == "en"][0].value, label[0].value),
  "url": select(
    target == "internal" => ${INTERNAL_URL},
    target == "external" => url,
    target == "email" => "mailto:" + email,
    target == "phone" => "tel:" + phone,
    target == "anchor" => "#" + anchor,
    null
  ),
  openInNewTab
}`;

const PERSON_PROJECTION = `{
  _id,
  name,
  position,
  email,
  phone,
  image
}`;

const LOCATION_PROJECTION = `{
  _id,
  "title": coalesce(title[_key == $locale][0].value, title[_key == "en"][0].value, title[0].value),
  "street": coalesce(street[_key == $locale][0].value, street[_key == "en"][0].value, street[0].value),
  number,
  postalCode,
  "city": coalesce(city[_key == $locale][0].value, city[_key == "en"][0].value, city[0].value),
  "country": coalesce(country[_key == $locale][0].value, country[_key == "en"][0].value, country[0].value),
  email,
  phone
}`;

const WORK_LIST_PROJECTION = `{
  _id,
  name,
  client,
  intro,
  year,
  code,
  featured,
  "slug": slug.current,
  image,
  "lqip": image.asset->metadata.lqip,
  "expertises": expertises[]->{_id, name, "slug": slug.current}
}`;

const WORK_FULL_PROJECTION = `{
  ...,
  "slug": slug.current,
  "expertises": expertises[]->{_id, name, "slug": slug.current},
  "related": related[]->${WORK_LIST_PROJECTION},
  // Every other case that has a thumbnail — feeds the "Related cases" slider on
  // the case detail. Excludes the current case (all locale variants by slug).
  "relatedCases": *[_type == "work" && defined(image) && slug.current != ^.slug.current && (locale == $locale || locale == null)] | order(_updatedAt desc)${WORK_LIST_PROJECTION},
  // Expand any file-asset refs nested inside the body so the FE has direct
  // URLs (Sanity images resolve their URL via urlFor() from just the _ref).
  "body": body[]{
    ...,
    _type == "videoEmbed" => {
      ...,
      "file": file{..., asset->{url}},
      "mobileFile": mobileFile{..., asset->{url}}
    }
  },
  // New case-layout fields with video URLs resolved (HLS wins over the upload).
  "hero": hero{kind, image, "lqip": image.asset->metadata.lqip, vimeoId, showControls, "videoUrl": coalesce(hlsUrl, file.asset->url), poster, "posterLqip": poster.asset->metadata.lqip, mobileVimeoId, "mobileVideoUrl": coalesce(mobileHlsUrl, mobileFile.asset->url), mobilePoster, "mobilePosterLqip": mobilePoster.asset->metadata.lqip},
  "mediaRows": mediaRows[]{fullBleed, items[]{kind, image, "lqip": image.asset->metadata.lqip, vimeoId, showControls, "videoUrl": coalesce(hlsUrl, file.asset->url), poster, "posterLqip": poster.asset->metadata.lqip, mobileVimeoId, "mobileVideoUrl": coalesce(mobileHlsUrl, mobileFile.asset->url), mobilePoster, "mobilePosterLqip": mobilePoster.asset->metadata.lqip}}
}`;

const EXPERTISE_PROJECTION = `{
  _id,
  name,
  "slug": slug.current,
  eyebrow,
  tagline,
  intro,
  body,
  servicesIntro,
  services,
  brioPaletteId,
  leadIn,
  "lead": lead->${PERSON_PROJECTION},
  order,
  cases,
  image
}`;

// ---------- Public fetch helpers ----------

const settingsAndChromeQuery = groq`{
  "settings": *[_type == "siteSettings" && (locale == $locale || locale == null)] | order(locale desc)[0]{
    title, tagline, email, phone, ogImage,
    "socials": socials[]{platform, url, label},
    "legalLinks": legalLinks[]${LINK_PROJECTION}
  },
  "footerMenu": *[_type == "menu" && identifier == "footer"][0]{items[]${LINK_PROJECTION}},
  "mainMenu": *[_type == "menu" && identifier == "main"][0]{items[]${LINK_PROJECTION}},
  "locations": *[_type == "location"] | order(_createdAt asc)${LOCATION_PROJECTION}
}`;

export function getChrome(locale: string = DEFAULT_SANITY_LOCALE) {
  return fetch<ChromeData>(settingsAndChromeQuery, { locale }, ["siteSettings", "menu", "location"]);
}

export function getHomePage(locale: string = DEFAULT_SANITY_LOCALE) {
  return fetch(
    groq`*[_type == "homePage" && (locale == $locale || locale == null)] | order(locale desc)[0]{
      ...,
      "cases": cases{
        title,
        "items": items[]{
          _key,
          fgColor,
          brioColors,
          trail,
          "work": work->${WORK_LIST_PROJECTION}
        }
      },
      awards
    }`,
    { locale },
    ["homePage"],
  );
}

export function getWorkIndex(locale: string = DEFAULT_SANITY_LOCALE) {
  return fetch(
    groq`{
      "page": *[_type == "workIndexPage" && (locale == $locale || locale == null)] | order(locale desc)[0],
      "items": *[_type == "work" && (locale == $locale || locale == null)] | order(_updatedAt desc)${WORK_LIST_PROJECTION}
    }`,
    { locale },
    ["workIndexPage", "work"],
  );
}

// Ask Vimeo's public oEmbed endpoint for a video's real dimensions and a
// thumbnail. The aspect (a CSS "w / h" string) lets gallery videos render at
// their native shape; the thumbnail is reused as a poster so a video box is
// never empty (on load, or when the player is repainted after scrolling back).
// Note: `fetch` is shadowed by the Sanity wrapper above, so call globalThis.fetch.
type VimeoMeta = { aspect: string | null; thumb: string | null };
async function vimeoMeta(id: string): Promise<VimeoMeta> {
  const [num, hash] = id.trim().split("/");
  const url = `https://vimeo.com/${num}${hash ? `/${hash}` : ""}`;
  try {
    const res = await globalThis.fetch(
      // width=1280 → a poster-sized thumbnail (ratio is preserved).
      `https://vimeo.com/api/oembed.json?width=1280&url=${encodeURIComponent(url)}`,
      { next: { revalidate: 86400 } },
    );
    if (!res.ok) return { aspect: null, thumb: null };
    const data = (await res.json()) as { width?: number; height?: number; thumbnail_url?: string };
    return {
      aspect: data.width && data.height ? `${data.width} / ${data.height}` : null,
      thumb: data.thumbnail_url ?? null,
    };
  } catch {
    return { aspect: null, thumb: null };
  }
}

// Mutates every Vimeo video item in-place (hero + gallery), attaching
// `vimeoAspect` (native ratio) and `vimeoThumb` (poster) for both the desktop
// and the optional mobile Vimeo ID. Runs the lookups in parallel; a failed
// lookup just leaves the item without them.
type VimeoItem = {
  kind?: string;
  vimeoId?: string;
  vimeoAspect?: string | null;
  vimeoThumb?: string | null;
  mobileVimeoId?: string;
  mobileVimeoAspect?: string | null;
  mobileVimeoThumb?: string | null;
};
async function attachVimeoMeta(work: { hero?: unknown; mediaRows?: unknown } | null): Promise<void> {
  const rows = (work?.mediaRows ?? []) as { items?: VimeoItem[] }[];
  const items: VimeoItem[] = [
    work?.hero as VimeoItem,
    ...rows.flatMap((row) => row?.items ?? []),
  ].filter(
    (item): item is VimeoItem =>
      !!item && item.kind === "video" && (!!item.vimeoId || !!item.mobileVimeoId),
  );
  await Promise.all(
    items.map(async (item) => {
      await Promise.all([
        item.vimeoId
          ? vimeoMeta(item.vimeoId).then((meta) => {
              item.vimeoAspect = meta.aspect;
              item.vimeoThumb = meta.thumb;
            })
          : null,
        item.mobileVimeoId
          ? vimeoMeta(item.mobileVimeoId).then((meta) => {
              item.mobileVimeoAspect = meta.aspect;
              item.mobileVimeoThumb = meta.thumb;
            })
          : null,
      ]);
    }),
  );
}

export async function getWork(slug: string, locale: string = DEFAULT_SANITY_LOCALE) {
  const work = await fetch<{ hero?: unknown; mediaRows?: unknown } | null>(
    groq`*[_type == "work" && slug.current == $slug && (locale == $locale || locale == null)] | order(locale desc)[0]${WORK_FULL_PROJECTION}`,
    { slug, locale },
    [`work:${slug}`, "work"],
  );
  if (work) await attachVimeoMeta(work);
  return work;
}

// New case-layout fields (hero / projectInfo / mediaRows), used by the /work-lab
// prototype. Picks the most recently edited work that has any of them filled, so
// whichever case an editor sets up shows up there without juggling slugs.
export function getWorkLayout(locale: string = DEFAULT_SANITY_LOCALE) {
  return fetch(
    groq`*[_type == "work"
      && (locale == $locale || locale == null)
      && (defined(hero) || defined(mediaRows) || defined(projectInfo))
    ] | order(_updatedAt desc)[0]{
      name,
      client,
      darkMode,
      hero{kind, image, "lqip": image.asset->metadata.lqip, vimeoId, showControls, "videoUrl": coalesce(hlsUrl, file.asset->url), poster, "posterLqip": poster.asset->metadata.lqip, mobileVimeoId, "mobileVideoUrl": coalesce(mobileHlsUrl, mobileFile.asset->url), mobilePoster, "mobilePosterLqip": mobilePoster.asset->metadata.lqip},
      projectInfo{sections[]{heading, body}, services},
      mediaRows[]{fullBleed, items[]{kind, image, "lqip": image.asset->metadata.lqip, vimeoId, showControls, "videoUrl": coalesce(hlsUrl, file.asset->url), poster, "posterLqip": poster.asset->metadata.lqip, mobileVimeoId, "mobileVideoUrl": coalesce(mobileHlsUrl, mobileFile.asset->url), mobilePoster, "mobilePosterLqip": mobilePoster.asset->metadata.lqip}}
    }`,
    { locale },
    ["work"],
  );
}

export function getExpertiseIndex(locale: string = DEFAULT_SANITY_LOCALE) {
  return fetch(
    groq`{
      "page": *[_type == "expertiseIndexPage" && (locale == $locale || locale == null)] | order(locale desc)[0]{
        ...,
        "pillars": pillars[]->${EXPERTISE_PROJECTION}
      },
      "pillars": *[_type == "expertise" && (locale == $locale || locale == null)] | order(order asc)${EXPERTISE_PROJECTION}
    }`,
    { locale },
    ["expertiseIndexPage", "expertise"],
  );
}

export function getExpertise(slug: string, locale: string = DEFAULT_SANITY_LOCALE) {
  return fetch(
    groq`{
      "expertise": *[_type == "expertise" && slug.current == $slug && (locale == $locale || locale == null)] | order(locale desc)[0]${EXPERTISE_PROJECTION},
      "cases": *[_type == "work" && $slug in expertises[]->slug.current && (locale == $locale || locale == null)] | order(featured desc, year desc)[0...12]${WORK_LIST_PROJECTION}
    }`,
    { slug, locale },
    [`expertise:${slug}`, "expertise", "work"],
  );
}

export function getAboutPage(locale: string = DEFAULT_SANITY_LOCALE) {
  return fetch(
    groq`*[_type == "aboutPage" && (locale == $locale || locale == null)] | order(locale desc)[0]`,
    { locale },
    ["aboutPage"],
  );
}

const JOB_LIST_PROJECTION = `{
  _id, "slug": slug.current, name, introIndex,
  "expertise": expertise->name,
  "location": location->${LOCATION_PROJECTION},
  type
}`;

export function getCareersPage(locale: string = DEFAULT_SANITY_LOCALE) {
  return fetch(
    groq`{
      "page": *[_type == "careersPage" && (locale == $locale || locale == null)] | order(locale desc)[0]{
        ...,
        "vacancies": vacancies{
          ...,
          "curated": curated[]->${JOB_LIST_PROJECTION}
        }
      },
      "jobs": *[_type == "job" && (locale == $locale || locale == null)] | order(order asc, _createdAt desc)${JOB_LIST_PROJECTION}
    }`,
    { locale },
    ["careersPage", "job"],
  );
}

export function getJobs(locale: string = DEFAULT_SANITY_LOCALE) {
  return fetch<JobListItem[]>(
    groq`*[_type == "job" && (locale == $locale || locale == null)] | order(order asc, _createdAt desc)${JOB_LIST_PROJECTION}`,
    { locale },
    ["job"],
  );
}

export interface JobListItem {
  _id: string;
  slug: string;
  name?: string | null;
  introIndex?: string | null;
  expertise?: string | null;
  location?: { _id?: string; title?: string | null; city?: string | null } | null;
  type?: string | null;
}

export function getJob(slug: string, locale: string = DEFAULT_SANITY_LOCALE) {
  return fetch(
    groq`*[_type == "job" && slug.current == $slug && (locale == $locale || locale == null)] | order(locale desc)[0]{
      ...,
      "slug": slug.current,
      "expertise": expertise->{_id, name, "slug": slug.current},
      "location": location->${LOCATION_PROJECTION},
      "contact": contact->${PERSON_PROJECTION}
    }`,
    { slug, locale },
    [`job:${slug}`, "job"],
  );
}

export function getContactPage(locale: string = DEFAULT_SANITY_LOCALE) {
  return fetch(
    groq`*[_type == "contactPage" && (locale == $locale || locale == null)] | order(locale desc)[0]{
      ...,
      "expertiseContacts": expertiseContacts[]{
        _key, label,
        "expertise": expertise->{_id, name, "slug": slug.current},
        "person": coalesce(person->${PERSON_PROJECTION}, expertise->lead->${PERSON_PROJECTION})
      },
      "locations": *[_type == "location"] | order(_createdAt asc)${LOCATION_PROJECTION}
    }`,
    { locale },
    ["contactPage", "expertise", "person", "location"],
  );
}

export function getLegalPage(kind: string, locale: string = DEFAULT_SANITY_LOCALE) {
  return fetch(
    groq`*[_type == "legalPage" && kind == $kind && (locale == $locale || locale == null)] | order(locale desc)[0]`,
    { kind, locale },
    [`legalPage:${kind}`],
  );
}

// ---------- Result types (loose; types are best-effort) ----------

export type SocialPlatform =
  | "linkedin"
  | "instagram"
  | "facebook"
  | "x"
  | "youtube"
  | "tiktok"
  | "github"
  | "other";

export interface ChromeData {
  settings: {
    title?: string;
    tagline?: string;
    email?: string;
    phone?: string;
    ogImage?: unknown;
    socials?: Array<{ platform: SocialPlatform; url: string; label?: string }>;
    legalLinks?: Array<{ _key: string; label: string; url: string; openInNewTab?: boolean }>;
  } | null;
  footerMenu: { items?: Array<{ _key: string; label: string; url: string; openInNewTab?: boolean }> } | null;
  mainMenu: { items?: Array<{ _key: string; label: string; url: string; openInNewTab?: boolean }> } | null;
  locations: Array<{
    _id: string;
    title: string;
    street?: string;
    number?: string;
    postalCode?: string;
    city?: string;
    country?: string;
    email?: string;
    phone?: string;
  }>;
}
