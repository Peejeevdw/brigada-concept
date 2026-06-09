/**
 * Server-side helper for subscribing visitors to the Mailcoach newsletter.
 *
 * Configured by env (all loaded at request time, never reach the browser):
 *   - MAILCOACH_API_URL   — base URL incl. /api, e.g. https://brigada.mailcoach.app/api
 *   - MAILCOACH_API_TOKEN — bearer token from Mailcoach → Settings → API tokens
 *   - MAILCOACH_LIST_UUID — UUID of the target list (open the list in admin,
 *                          the UUID is in the URL: /email-lists/{uuid})
 *
 * `subscribeToNewsletter()` POSTs the visitor's email to Mailcoach's
 * `email-lists/{uuid}/subscribers` endpoint. Mailcoach handles the
 * double-opt-in confirmation flow itself when the list has it enabled.
 */

export type MailcoachStatus =
  | "subscribed"
  | "pending"
  | "already-subscribed"
  | "config-missing"
  | "rate-limited"
  | "rejected"
  | "network-error";

export interface SubscribeInput {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}

export interface SubscribeResult {
  ok: boolean;
  status: MailcoachStatus;
  /** Human-readable message — surfaced to the API caller on failure. */
  message?: string;
}

interface MailcoachConfig {
  baseUrl: string;
  token: string;
  listUuid: string;
}

function readConfig(): MailcoachConfig | null {
  const baseUrl = process.env.MAILCOACH_API_URL;
  const token = process.env.MAILCOACH_API_TOKEN;
  const listUuid = process.env.MAILCOACH_LIST_UUID;
  if (!baseUrl || !token || !listUuid) return null;
  // Strip trailing slash so we can append paths cleanly.
  return {baseUrl: baseUrl.replace(/\/+$/, ""), token, listUuid};
}

export async function subscribeToNewsletter(
  input: SubscribeInput,
): Promise<SubscribeResult> {
  const config = readConfig();
  if (!config) {
    console.error(
      "[mailcoach] Missing env vars — set MAILCOACH_API_URL, MAILCOACH_API_TOKEN, MAILCOACH_LIST_UUID",
    );
    return {ok: false, status: "config-missing"};
  }

  const payload: Record<string, unknown> = {email: input.email.trim()};
  if (input.firstName) payload.first_name = input.firstName.trim();
  if (input.lastName) payload.last_name = input.lastName.trim();

  let res: Response;
  try {
    res = await fetch(`${config.baseUrl}/email-lists/${config.listUuid}/subscribers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[mailcoach] Network error:", err);
    return {ok: false, status: "network-error"};
  }

  if (res.status === 201 || res.status === 200) {
    // 201 = newly subscribed. With double opt-in, the subscriber lands in
    // "pending" state inside Mailcoach until they click the confirmation
    // email. From our side the call still succeeds.
    return {ok: true, status: "subscribed"};
  }

  if (res.status === 422) {
    // Validation — most commonly "email has already been taken".
    const body = (await res.json().catch(() => null)) as {
      message?: string;
      errors?: Record<string, string[]>;
    } | null;
    const emailError = body?.errors?.email?.[0] ?? body?.message ?? "";
    if (/already/i.test(emailError)) {
      return {ok: true, status: "already-subscribed"};
    }
    return {ok: false, status: "rejected", message: emailError};
  }

  if (res.status === 429) {
    return {ok: false, status: "rate-limited"};
  }

  const errorText = await res.text().catch(() => "");
  console.error(
    `[mailcoach] Subscribe failed (${res.status}): ${errorText.slice(0, 200)}`,
  );
  return {ok: false, status: "rejected", message: `HTTP ${res.status}`};
}
