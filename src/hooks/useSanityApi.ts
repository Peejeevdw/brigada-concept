import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import groq from "groq";
import { DEFAULT_SANITY_LOCALE, sanityClient } from "@/lib/sanity";
import type {
  FooterContentQueryResult,
  MenuByIdentifierQueryResult,
} from "@/types/sanity.generated";

// Site Settings is one document per locale. The `locale` field is hidden in Studio
// and may be null on legacy docs, so we accept either an exact locale match or null
// and pick the most specific result.
//
// `socials.label` falls back to the platform value if the editor left it blank.
// `legalLinks.href` is resolved server-side: external URL wins, otherwise the
// internal reference maps to its singleton route (extend the select() as new
// internal page types are added).
//
// Locations resolve internationalizedArrayString fields to the current locale,
// falling back to "en" then the first available value.
const SETTINGS_PROJECTION = groq`{
  title,
  email,
  phone,
  socials[]{
    platform,
    url,
    "label": coalesce(label, platform)
  },
  legalLinks[]{
    label,
    "href": coalesce(external, select(internal->_type == "privacyPage" => "/privacy"))
  }
}`;

const footerContentQuery = groq`{
  "settings": *[_type == "siteSettings" && (locale == $locale || locale == null)] | order(locale desc)[0]${SETTINGS_PROJECTION},
  "fallbackSettings": *[_type == "siteSettings"][0]${SETTINGS_PROJECTION},
  "locations": *[_type == "location"] | order(_createdAt asc){
    "title": coalesce(title[_key == $locale][0].value, title[_key == "en"][0].value, title[0].value),
    "street": coalesce(street[_key == $locale][0].value, street[_key == "en"][0].value, street[0].value),
    number,
    postalCode,
    "city": coalesce(city[_key == $locale][0].value, city[_key == "en"][0].value, city[0].value),
    "country": coalesce(country[_key == $locale][0].value, country[_key == "en"][0].value, country[0].value)
  }
}`;

// Resolves a menu document by its stable `identifier`. For each item, projects
// the locale-resolved label and a single `url`:
//   - falls back to the manual `external` URL when no internal ref is set
//   - resolves internal references via `select()` per page type. Singletons
//     map to their fixed FE route; slugged docs use `slug.current`.
// Keep the select() cases in sync with LINKABLE_TYPES in
// studio/schemaTypes/objects/menuItem.ts.
const menuByIdentifierQuery = groq`*[_type == "menu" && identifier == $identifier][0]{
  identifier,
  items[]{
    "label": coalesce(label[_key == $locale][0].value, label[_key == "en"][0].value, label[0].value),
    "url": coalesce(
      select(
        internal->_type == "homePage" => "/",
        internal->_type == "aboutPage" => "/about",
        internal->_type == "careersPage" => "/careers",
        internal->_type == "contactPage" => "/contact",
        internal->_type == "privacyPage" => "/privacy",
        internal->_type == "work" => "/work/" + internal->slug.current,
        internal->_type == "expertise" => "/expertise/" + internal->slug.current,
        internal->_type == "job" => "/careers/" + internal->slug.current
      ),
      external
    ),
    openInNewTab
  }
}`;

/** Run a GROQ query against the configured Sanity client. Returns null if no client is configured. */
const sanityFetch = async <T>(query: string, params: Record<string, unknown>): Promise<T | null> => {
  if (!sanityClient) return null;
  try {
    return await sanityClient.fetch<T>(query, params);
  } catch (error) {
    console.error("Sanity query failed:", error);
    return null;
  }
};

/** Fetch the footer payload (site settings + locations). */
export const useGetFooterContent = (
  locale: string = DEFAULT_SANITY_LOCALE,
): UseQueryResult<FooterContentQueryResult | null> =>
  useQuery({
    queryKey: ["footerContent", locale],
    queryFn: () => sanityFetch<FooterContentQueryResult>(footerContentQuery, { locale }),
    staleTime: 1000 * 60 * 5,
  });

/** Fetch a menu by its stable identifier (e.g. "footer", "main"). */
export const useGetMenu = (
  identifier: string,
  locale: string = DEFAULT_SANITY_LOCALE,
): UseQueryResult<MenuByIdentifierQueryResult | null> =>
  useQuery({
    queryKey: ["menu", identifier, locale],
    queryFn: () => sanityFetch<MenuByIdentifierQueryResult>(menuByIdentifierQuery, { identifier, locale }),
    staleTime: 1000 * 60 * 5,
  });
