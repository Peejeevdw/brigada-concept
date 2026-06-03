"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ChromeData } from "@/lib/sanity-fetch";

const SiteChromeContext = createContext<ChromeData | null>(null);

export function SiteChromeProvider({
  value,
  children,
}: {
  value: ChromeData | null;
  children: ReactNode;
}) {
  return <SiteChromeContext.Provider value={value}>{children}</SiteChromeContext.Provider>;
}

/**
 * Read Sanity-backed chrome (siteSettings, menus, locations). Returns null when
 * Sanity is unconfigured or the query failed — components should fall back to
 * their hardcoded defaults in that case.
 */
export function useSiteChrome(): ChromeData | null {
  return useContext(SiteChromeContext);
}
