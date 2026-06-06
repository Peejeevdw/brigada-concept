/**
 * Server-side Turnstile verification. Calls Cloudflare's siteverify
 * endpoint with the secret + token + (optional) remote IP. Returns the
 * full response so callers can log the verdict alongside the submission.
 *
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileResult {
  success: boolean;
  /** Cloudflare's verdict string (e.g. `low_score`, `bad-request`, …). */
  verdict: string;
  errors: string[];
  hostname?: string;
  action?: string;
}

export async function verifyTurnstile(
  token: string | null | undefined,
  remoteIp?: string | null,
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // No secret configured — treat as a no-op pass in development so the
    // form keeps working locally. The API route logs this so it doesn't
    // sneak into production unnoticed.
    return {
      success: true,
      verdict: "turnstile-disabled",
      errors: ["TURNSTILE_SECRET_KEY not set"],
    };
  }
  if (!token) {
    return {success: false, verdict: "missing-token", errors: ["missing-input-response"]};
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (remoteIp) body.set("remoteip", remoteIp);

  const res = await fetch(SITEVERIFY_URL, {method: "POST", body});
  if (!res.ok) {
    return {success: false, verdict: `http-${res.status}`, errors: [`http-${res.status}`]};
  }
  const data = (await res.json()) as {
    success?: boolean;
    "error-codes"?: string[];
    hostname?: string;
    action?: string;
  };
  return {
    success: Boolean(data.success),
    verdict: data.success ? "verified" : (data["error-codes"]?.[0] ?? "rejected"),
    errors: data["error-codes"] ?? [],
    hostname: data.hostname,
    action: data.action,
  };
}
