/**
 * Thin wrapper around GTM's window.dataLayer push so the call sites stay
 * one-liners. GTM (loaded in app/layout.tsx) primes `window.dataLayer`;
 * we still guard for SSR and ad-blocker scenarios where it may not exist.
 */
declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function pushFormSubmission(formType: "contact" | "job_application") {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({event: "form_submission", form_type: formType});
}
