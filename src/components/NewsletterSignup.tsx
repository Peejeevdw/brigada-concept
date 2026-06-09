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

  const inputBorder = lightText ? "border-white/30" : "border-brigada-black/30";
  const placeholder = lightText ? "placeholder:text-white/40" : "placeholder:text-brigada-black/40";
  const muted = lightText ? "text-white/60" : "text-brigada-black/60";

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
          <div className={`flex items-center gap-2 border-b pb-1 ${inputBorder}`}>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`min-w-0 flex-1 bg-transparent text-[clamp(13px,1vw,15px)] outline-none ${placeholder}`}
            />
            <button
              type="submit"
              disabled={submitting}
              aria-label="Sign up for the newsletter"
              className="shrink-0 text-[clamp(13px,1vw,15px)] transition-opacity hover:opacity-60 disabled:opacity-40"
            >
              {submitting ? "…" : "→"}
            </button>
          </div>
          <label
            className={`flex items-start gap-2 text-[clamp(11px,0.85vw,13px)] leading-[1.4] ${muted}`}
          >
            <input
              type="checkbox"
              checked={gdpr}
              onChange={(e) => setGdpr(e.target.checked)}
              className="mt-[3px] accent-current"
              required
            />
            <span>
              I agree to the{" "}
              <a href="/privacy" className="underline underline-offset-2">
                privacy policy
              </a>
              .
            </span>
          </label>
          {TURNSTILE_SITE_KEY && (
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
