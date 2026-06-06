import {headers} from "next/headers";
import {getSanityWriteClient} from "./sanity-write";
import {verifyTurnstile} from "./turnstile";

/**
 * Single entry-point for the contact and job-application form handlers.
 * Both routes funnel into here so verification + storage + notification
 * stay in lockstep.
 */

export interface SubmissionFile {
  /** Form field name the file came from (e.g. "cv"). */
  fieldName: string;
  /** Human-readable label, taken from the form field config. */
  fieldLabel: string;
  filename: string;
  mimeType: string;
  bytes: ArrayBuffer;
}

export interface FormSubmissionPayload {
  kind: "contact" | "job-application";
  jobId?: string | null;
  /** Optional job name + slug used to compose the notification email subject. */
  jobName?: string | null;
  jobSlug?: string | null;
  fields: Array<{
    name: string;
    label: string;
    value: string;
  }>;
  files?: SubmissionFile[];
  turnstileToken?: string | null;
  /** Public-page URL the form was submitted from (for the email's context). */
  pageUrl?: string | null;
}

export interface FormSubmissionResult {
  ok: boolean;
  error?: string;
  /** Sanity document ID — only set on success. */
  id?: string;
}

const SUBJECT_PREFIX = "[brigada.be]";

function pick(fields: FormSubmissionPayload["fields"], needle: string) {
  return fields.find((f) => f.name.toLowerCase().includes(needle))?.value;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderEmailHtml(payload: FormSubmissionPayload, submittedAt: string) {
  const rows = payload.fields
    .map(
      (f) => `
        <tr>
          <td style="padding:8px 12px;font-weight:600;vertical-align:top;width:200px;border-bottom:1px solid #eee">${escapeHtml(f.label || f.name)}</td>
          <td style="padding:8px 12px;white-space:pre-wrap;border-bottom:1px solid #eee">${escapeHtml(f.value || "")}</td>
        </tr>`,
    )
    .join("");
  const kindLabel =
    payload.kind === "job-application"
      ? `Job application${payload.jobName ? ` — ${escapeHtml(payload.jobName)}` : ""}`
      : "Contact form";
  return `
    <div style="font-family:system-ui,Arial,sans-serif;font-size:14px;color:#181614">
      <p style="margin:0 0 16px"><strong>${kindLabel}</strong></p>
      <p style="margin:0 0 16px;color:#666">${escapeHtml(submittedAt)}</p>
      <table style="border-collapse:collapse;width:100%;max-width:640px">
        ${rows}
      </table>
      ${payload.pageUrl ? `<p style="margin:24px 0 0;color:#666;font-size:12px">Submitted from <a href="${escapeHtml(payload.pageUrl)}">${escapeHtml(payload.pageUrl)}</a></p>` : ""}
    </div>
  `;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  // 32k chunks keep us under typical stack limits for fromCharCode.apply.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + CHUNK) as unknown as number[],
    );
  }
  // btoa is available in Workers + modern Node.
  return typeof btoa === "function"
    ? btoa(binary)
    : Buffer.from(binary, "binary").toString("base64");
}

async function sendEmail(payload: FormSubmissionPayload, submittedAt: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM_EMAIL;
  const toAddress = process.env.CONTACT_EMAIL_TO;

  if (!apiKey || !fromAddress || !toAddress) {
    console.warn(
      "[form-submit] Resend not fully configured (RESEND_API_KEY / RESEND_FROM_EMAIL / CONTACT_EMAIL_TO) — skipping notification email",
    );
    return;
  }

  const senderName = pick(payload.fields, "name") || "(no name)";
  const subject =
    payload.kind === "job-application"
      ? `${SUBJECT_PREFIX} Application: ${payload.jobName ?? "(unknown job)"} — ${senderName}`
      : `${SUBJECT_PREFIX} Contact form — ${senderName}`;

  const replyTo = pick(payload.fields, "email");

  const attachments = (payload.files ?? []).map((f) => ({
    filename: f.filename,
    content: bufferToBase64(f.bytes),
  }));

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [toAddress],
      subject,
      html: renderEmailHtml(payload, submittedAt),
      reply_to: replyTo || undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
    }),
  });
  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    console.error(
      `[form-submit] Resend send failed (${res.status}): ${errorBody.slice(0, 200)}`,
    );
  }
}

export async function handleFormSubmission(
  payload: FormSubmissionPayload,
): Promise<FormSubmissionResult> {
  if (!payload.fields || payload.fields.length === 0) {
    return {ok: false, error: "no-fields"};
  }

  const headerList = await headers();
  const remoteIp =
    headerList.get("cf-connecting-ip") ??
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  const userAgent = headerList.get("user-agent") ?? "";
  const referer = headerList.get("referer") ?? "";

  const verification = await verifyTurnstile(payload.turnstileToken, remoteIp);
  if (!verification.success) {
    return {ok: false, error: `turnstile:${verification.verdict}`};
  }

  const client = getSanityWriteClient();
  if (!client) {
    console.error("[form-submit] Sanity write client unavailable (missing SANITY_WRITE_TOKEN?)");
    return {ok: false, error: "storage-unavailable"};
  }

  const submittedAt = new Date().toISOString();

  // Upload any files to Sanity assets first so the resulting doc holds
  // proper asset refs. Best-effort: if an upload fails we log + continue
  // with the rest (so a single corrupt CV doesn't lose the whole apply).
  const attachmentRefs: Array<{
    _key: string;
    _type: "submissionFile";
    asset: {_type: "reference"; _ref: string};
  }> = [];
  for (const file of payload.files ?? []) {
    try {
      const blob = new Blob([file.bytes], {
        type: file.mimeType || "application/octet-stream",
      });
      const asset = await client.assets.upload("file", blob, {
        filename: file.filename,
        contentType: file.mimeType || undefined,
      });
      attachmentRefs.push({
        _key: `${file.fieldName}-${attachmentRefs.length}`,
        _type: "submissionFile",
        asset: {_type: "reference", _ref: asset._id},
      });
    } catch (err) {
      console.error(`[form-submit] Sanity asset upload failed for ${file.filename}:`, err);
    }
  }

  // Sanitise long values so a runaway paste doesn't blow up the doc.
  const MAX_VALUE_LENGTH = 10_000;
  const entries = payload.fields.map((f) => ({
    _type: "submissionEntry" as const,
    _key: f.name || Math.random().toString(36).slice(2),
    name: f.name,
    label: f.label || f.name,
    value: (f.value ?? "").slice(0, MAX_VALUE_LENGTH),
  }));

  const doc = {
    _type: "formSubmission" as const,
    kind: payload.kind,
    submittedAt,
    ...(payload.jobId
      ? {job: {_type: "reference" as const, _ref: payload.jobId, _weak: true}}
      : {}),
    entries,
    ...(attachmentRefs.length > 0 ? {attachments: attachmentRefs} : {}),
    meta: {
      ip: remoteIp || undefined,
      userAgent: userAgent.slice(0, 500) || undefined,
      referer: referer.slice(0, 500) || undefined,
      turnstileVerdict: verification.verdict,
    },
  };

  let createdId: string;
  try {
    const created = await client.create(doc);
    createdId = created._id;
  } catch (err) {
    console.error("[form-submit] Sanity write failed:", err);
    return {ok: false, error: "storage-failed"};
  }

  // Email is best-effort — never let a failed send block the user's
  // success state when the submission itself is already stored.
  try {
    await sendEmail(payload, submittedAt);
  } catch (err) {
    console.error("[form-submit] Email send threw:", err);
  }

  return {ok: true, id: createdId};
}
