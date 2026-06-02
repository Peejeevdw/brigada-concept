import "server-only";
import groq from "groq";
import { sanityClient, DEFAULT_SANITY_LOCALE } from "./sanity";
import type {
  FooterContentQueryResult,
  MenuByIdentifierQueryResult,
} from "@/types/sanity.generated";

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

async function sanityFetch<T>(
  query: string,
  params: Record<string, unknown>,
): Promise<T | null> {
  if (!sanityClient) return null;
  try {
    return await sanityClient.fetch<T>(query, params);
  } catch (error) {
    console.error("Sanity query failed:", error);
    return null;
  }
}

export function getFooterContent(locale: string = DEFAULT_SANITY_LOCALE) {
  return sanityFetch<FooterContentQueryResult>(footerContentQuery, { locale });
}

export function getMenu(identifier: string, locale: string = DEFAULT_SANITY_LOCALE) {
  return sanityFetch<MenuByIdentifierQueryResult>(menuByIdentifierQuery, {
    identifier,
    locale,
  });
}
