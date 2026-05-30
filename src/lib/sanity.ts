import { createClient } from "@sanity/client";

const readEnv = (key: string) => {
  const value = import.meta.env[key];
  return typeof value === "string" ? value.trim() : "";
};

export const SANITY_PROJECT_ID = readEnv("VITE_SANITY_PROJECT_ID");
export const SANITY_DATASET = readEnv("VITE_SANITY_DATASET") || "production";
export const SANITY_API_VERSION = readEnv("VITE_SANITY_API_VERSION") || "2026-04-08";
export const DEFAULT_SANITY_LOCALE = readEnv("VITE_SANITY_LOCALE") || "en";

export const sanityClient =
  SANITY_PROJECT_ID && SANITY_DATASET
    ? createClient({
        projectId: SANITY_PROJECT_ID,
        dataset: SANITY_DATASET,
        apiVersion: SANITY_API_VERSION,
        useCdn: !import.meta.env.DEV,
      })
    : null;
