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
      // In production we cache by tag so a webhook can revalidate the
      // affected pages. In dev we always bypass the cache so editor changes
      // are reflected on the next request without a server restart.
      ...(process.env.NODE_ENV === "production"
        ? { next: { tags: ["sanity", ...tags] } }
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
  "expertises": expertises[]->{_id, name, "slug": slug.current}
}`;

const WORK_FULL_PROJECTION = `{
  ...,
  "slug": slug.current,
  "expertises": expertises[]->{_id, name, "slug": slug.current},
  "related": related[]->${WORK_LIST_PROJECTION},
  // Expand any file-asset refs nested inside the body so the FE has direct
  // URLs (Sanity images resolve their URL via urlFor() from just the _ref).
  "body": body[]{
    ...,
    _type == "videoEmbed" => {
      ...,
      "file": file{..., asset->{url}}
    }
  }
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
      "items": *[_type == "work" && (locale == $locale || locale == null)] | order(featured desc, year desc, _createdAt desc)${WORK_LIST_PROJECTION}
    }`,
    { locale },
    ["workIndexPage", "work"],
  );
}

export function getWork(slug: string, locale: string = DEFAULT_SANITY_LOCALE) {
  return fetch(
    groq`*[_type == "work" && slug.current == $slug && (locale == $locale || locale == null)] | order(locale desc)[0]${WORK_FULL_PROJECTION}`,
    { slug, locale },
    [`work:${slug}`, "work"],
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
