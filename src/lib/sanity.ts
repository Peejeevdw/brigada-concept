import { createClient, type SanityClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";

export const SANITY_PROJECT_ID = process.env.SANITY_PROJECT_ID ?? "";
export const SANITY_DATASET = process.env.SANITY_DATASET ?? "production";
export const SANITY_API_VERSION = process.env.SANITY_API_VERSION ?? "2026-04-08";
export const SANITY_STUDIO_URL =
  process.env.SANITY_STUDIO_URL ?? "http://localhost:3333";
export const DEFAULT_SANITY_LOCALE = process.env.SANITY_LOCALE ?? "en";

/** Read-only token used for previewing drafts in Next.js Draft Mode. */
export const SANITY_VIEWER_TOKEN = process.env.SANITY_VIEWER_TOKEN ?? "";

if (!SANITY_PROJECT_ID && process.env.NODE_ENV !== "test") {
  console.warn(
    "SANITY_PROJECT_ID is not set. Sanity-backed pages will return null. Set it in .env (and in Cloudflare for production).",
  );
}

/**
 * Default Sanity client — used by the server-side fetch helpers in
 * `sanity-fetch.ts`. CDN-backed in production, perspective fixed to published.
 * Stega is left disabled here; the draft-mode wrapper enables it on demand.
 */
export const sanityClient: SanityClient | null = SANITY_PROJECT_ID
  ? createClient({
      projectId: SANITY_PROJECT_ID,
      dataset: SANITY_DATASET,
      apiVersion: SANITY_API_VERSION,
      useCdn: process.env.NODE_ENV === "production",
      perspective: "published",
      // Pass the viewer token: some doc types in this dataset (e.g. `job`,
      // imported from Recruitee) are not readable by anonymous queries.
      // `perspective: "published"` still hides drafts, so this only grants
      // read access — never exposes unpublished content.
      token: SANITY_VIEWER_TOKEN || undefined,
      stega: { studioUrl: SANITY_STUDIO_URL, enabled: false },
    })
  : null;

const imageBuilder = sanityClient ? imageUrlBuilder(sanityClient) : null;

export function urlFor(source: SanityImageSource | undefined | null) {
  if (!imageBuilder || !source) return null;
  return imageBuilder.image(source);
}
