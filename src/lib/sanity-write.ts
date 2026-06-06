import {createClient, type SanityClient} from "@sanity/client";
import {
  SANITY_API_VERSION,
  SANITY_DATASET,
  SANITY_PROJECT_ID,
} from "./sanity";

/**
 * Server-side write client. Only mounted in API routes — never imported
 * from a client component. The token has write permissions, so it must
 * never reach the browser bundle.
 *
 * Returns `null` when the project ID or the token is missing, so callers
 * can degrade gracefully (e.g. skip the Sanity backup in local dev when
 * the env var hasn't been set yet) instead of crashing.
 */
export function getSanityWriteClient(): SanityClient | null {
  const token = process.env.SANITY_WRITE_TOKEN;
  if (!SANITY_PROJECT_ID || !token) return null;
  return createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    token,
    useCdn: false,
    perspective: "raw",
  });
}
