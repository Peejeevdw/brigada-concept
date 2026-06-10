"use client";

import {useState} from "react";
import {TurnstileWidget} from "@/components/TurnstileWidget";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

/**
 * Newsletter sign-up, dropped inside the Contact column of `BrandFooter`.
 * Designed to slot in with the column rhythm: small uppercase label like
 * the other column headings, single-line input + Sign up button, GDPR
 * consent and Turnstile widget tucked underneath.
 *
 * Posts to `/api/newsletter/subscribe`, which forwards to Mailcoach.
 */
export default function NewsletterSignup({lightText = false}: {lightText?: boolean}) {
  const [email, setEmail] = useState("");
  const [gdpr, setGdpr] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "already" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const muted = lightText ? "text-white/60" : "text-brigada-black/60";
  // The signup pill is always a white surface with a black "subscribe" button —
  // on both the dark footer and the coloured (brio) footers.
  const pillBg = "bg-white";
  const pillText = "text-brigada-black";
  const pillPlaceholder = "placeholder:text-brigada-black/40";
  const btnBg = "bg-brigada-black";
  const btnText = "text-white";
  // The round consent checkbox sits directly on the footer background, so its
  // border + checked fill follow that background: white on the dark footer,
  // black on the coloured footers.
  const checkboxBorder = lightText ? "border-white/40" : "border-brigada-black/40";
  const checkboxChecked = lightText
    ? "checked:border-white checked:bg-white"
    : "checked:border-brigada-black checked:bg-brigada-black";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    if (!gdpr) {
      setError("Please accept the privacy policy first.");
      return;
    }
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Please complete the challenge first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({email, turnstileToken}),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        status?: string;
        error?: string;
      };
      if (res.ok && json.ok) {
        setStatus(json.status === "already-subscribed" ? "already" : "ok");
        setEmail("");
        setGdpr(false);
      } else {
        setStatus("error");
        setError(
          json.error === "rate-limited"
            ? "Too many sign-ups from this network. Try again in a few minutes."
            : json.error?.startsWith("turnstile:")
              ? "The challenge couldn’t be verified. Reload and try again."
              : "Something went wrong. Please try again later.",
        );
      }
    } catch {
      setStatus("error");
      setError("Couldn’t reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <p className="text-[clamp(12px,1vw,15px)] font-normal opacity-50">Newsletter</p>

      {status === "ok" ? (
        <p className={`text-[clamp(13px,1vw,15px)] leading-[1.4] ${muted}`}>
          Thanks — check your inbox for a confirmation email.
        </p>
      ) : status === "already" ? (
        <p className={`text-[clamp(13px,1vw,15px)] leading-[1.4] ${muted}`}>
          You’re already on the list.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div
            className={`flex max-w-[clamp(320px,28vw,400px)] items-center gap-1.5 rounded-full p-[3px] pl-[clamp(14px,1.4vw,18px)] ${pillBg}`}
          >
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`min-w-0 flex-1 bg-transparent text-[clamp(12px,0.85vw,13px)] outline-none ${pillText} ${pillPlaceholder}`}
            />
            <button
              type="submit"
              disabled={submitting}
              aria-label="Sign up for the newsletter"
              className={`shrink-0 rounded-full px-[clamp(14px,1.4vw,18px)] py-[clamp(6px,0.7vw,9px)] text-[clamp(12px,0.85vw,13px)] leading-none transition-opacity hover:opacity-80 disabled:opacity-50 ${btnBg} ${btnText}`}
            >
              {submitting ? "…" : "subscribe"}
            </button>
          </div>
          <label
            className={`flex items-center gap-2 text-[clamp(11px,0.8vw,12px)] leading-none ${muted}`}
          >
            <input
              type="checkbox"
              checked={gdpr}
              onChange={(e) => {
                setGdpr(e.target.checked);
                // The Turnstile widget only mounts after the GDPR box is
                // ticked, so any previously issued token is stale if the
                // box flips back off. Reset it so we don't submit with a
                // dangling token.
                if (!e.target.checked) setTurnstileToken(null);
              }}
              className={`h-3 w-3 shrink-0 appearance-none rounded-full border bg-transparent transition-colors ${checkboxBorder} ${checkboxChecked}`}
              required
            />
            <span>
              I accept the{" "}
              <a href="/privacy" className="underline underline-offset-2">
                terms &amp; privacy policy
              </a>
              .
            </span>
          </label>
          {/* Turnstile only mounts once the visitor has accepted the privacy
              policy — keeps the Cloudflare challenge widget hidden on first
              view so it doesn't dominate the footer. */}
          {gdpr && TURNSTILE_SITE_KEY && (
            <TurnstileWidget
              siteKey={TURNSTILE_SITE_KEY}
              action="newsletter-subscribe"
              theme={lightText ? "dark" : "light"}
              onVerify={setTurnstileToken}
              onExpire={() => setTurnstileToken(null)}
            />
          )}
          {error && (
            <p className="text-[clamp(11px,0.85vw,13px)] text-red-500" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
