import { createClient, type SanityClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";

export const SANITY_PROJECT_ID = process.env.SANITY_PROJECT_ID ?? "";
export const SANITY_DATASET = process.env.SANITY_DATASET ?? "production";
export const SANITY_API_VERSION = process.env.SANITY_API_VERSION ?? "2026-04-08";
export const DEFAULT_SANITY_LOCALE = process.env.SANITY_LOCALE ?? "en";

if (!SANITY_PROJECT_ID && process.env.NODE_ENV !== "test") {
  console.warn(
    "SANITY_PROJECT_ID is not set. Sanity-backed pages will return null. Set it in .env (and in Cloudflare for production).",
  );
}

export const sanityClient: SanityClient | null = SANITY_PROJECT_ID
  ? createClient({
      projectId: SANITY_PROJECT_ID,
      dataset: SANITY_DATASET,
      apiVersion: SANITY_API_VERSION,
      useCdn: process.env.NODE_ENV === "production",
      perspective: "published",
    })
  : null;

const imageBuilder = sanityClient ? imageUrlBuilder(sanityClient) : null;

export function urlFor(source: SanityImageSource | undefined | null) {
  if (!imageBuilder || !source) return null;
  return imageBuilder.image(source);
}
