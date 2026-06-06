"use client";

import {useEffect, useRef} from "react";

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__brigadaTurnstileReady";
const SCRIPT_ID = "cf-turnstile-script";

interface TurnstileGlobal {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      theme?: "light" | "dark" | "auto";
      size?: "normal" | "compact" | "flexible";
      action?: string;
      callback: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileGlobal;
    __brigadaTurnstileReady?: () => void;
  }
}

const readyCallbacks: Array<() => void> = [];

function ensureScriptLoaded(): Promise<TurnstileGlobal> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return;
    if (window.turnstile) {
      resolve(window.turnstile);
      return;
    }
    readyCallbacks.push(() => {
      if (window.turnstile) resolve(window.turnstile);
    });
    if (document.getElementById(SCRIPT_ID)) return;

    window.__brigadaTurnstileReady = () => {
      while (readyCallbacks.length) readyCallbacks.shift()?.();
    };
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });
}

interface Props {
  /** Public site key — from Cloudflare Turnstile dashboard. */
  siteKey: string;
  /** Receives the token when the visitor solves the challenge. */
  onVerify: (token: string) => void;
  /** Optional: fired when the token expires or fails. Resets local state. */
  onExpire?: () => void;
  /** Identifier surfaced in Turnstile analytics (max 32 chars). */
  action?: string;
  /** Light/dark theme — defaults to auto. */
  theme?: "light" | "dark" | "auto";
  className?: string;
}

/**
 * Renders the Cloudflare Turnstile widget. Mounts on first render, removes
 * itself on unmount. Caller drives state through `onVerify` / `onExpire`.
 */
export function TurnstileWidget({
  siteKey,
  onVerify,
  onExpire,
  action,
  theme = "auto",
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  onVerifyRef.current = onVerify;
  onExpireRef.current = onExpire;

  useEffect(() => {
    let cancelled = false;
    ensureScriptLoaded().then((ts) => {
      if (cancelled || !containerRef.current) return;
      widgetIdRef.current = ts.render(containerRef.current, {
        sitekey: siteKey,
        theme,
        action,
        callback: (token) => onVerifyRef.current(token),
        "error-callback": () => onExpireRef.current?.(),
        "expired-callback": () => onExpireRef.current?.(),
      });
    });
    return () => {
      cancelled = true;
      const id = widgetIdRef.current;
      if (id && window.turnstile) window.turnstile.remove(id);
      widgetIdRef.current = null;
    };
  }, [siteKey, theme, action]);

  return <div ref={containerRef} className={className} />;
}
