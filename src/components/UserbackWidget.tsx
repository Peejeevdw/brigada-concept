"use client";

import { useEffect } from "react";

/**
 * Userback feedback widget, gated behind a query-string flag so it stays
 * invisible for normal visitors and never needs to be removed for launch.
 *
 * Enable for the current session:
 *   visit `https://brigada.be/?feedback=on` (or any page with that param)
 *
 * Once enabled, the widget keeps loading on every subsequent page in the
 * same tab (sessionStorage flag). Close the tab or visit with
 * `?feedback=off` to drop it.
 */

const STORAGE_KEY = "brigada-userback";
const ACCESS_TOKEN = "P-5pU6Vjxdh0SKBUJ9BCa7vCm3U";
const SCRIPT_ID = "userback-widget-script";

declare global {
  interface Window {
    Userback?: {
      access_token?: string;
      user_data?: Record<string, unknown>;
    };
  }
}

export default function UserbackWidget() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Honour the query-string toggles before reading the persisted flag, so
    // an explicit `?feedback=off` always wins.
    const params = new URLSearchParams(window.location.search);
    const param = params.get("feedback");
    if (param === "on") {
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* sessionStorage blocked — proceed in-memory only for this load */
      }
    } else if (param === "off") {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* noop */
      }
      return;
    }

    let enabled = false;
    try {
      enabled = sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // sessionStorage blocked — only enable if the param was set this load.
      enabled = param === "on";
    }
    if (!enabled) return;

    // Don't double-inject if a previous render already added the script.
    if (document.getElementById(SCRIPT_ID)) return;

    window.Userback = window.Userback || {};
    window.Userback.access_token = ACCESS_TOKEN;

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = "https://static.userback.io/widget/v1.js";
    (document.head || document.body).appendChild(script);
  }, []);

  return null;
}
