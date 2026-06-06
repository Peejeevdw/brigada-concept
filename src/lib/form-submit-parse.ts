import type {FormSubmissionPayload, SubmissionFile} from "./form-submit";

/**
 * Parse a request body into the shared FormSubmissionPayload shape.
 *
 * Two transports are supported:
 *  - `application/json` — used by the contact form (text-only fields).
 *  - `multipart/form-data` — used by the job apply form when there is at
 *    least one file. Multipart still carries the JSON payload as a
 *    `payload` part; files arrive on their own field names and are
 *    matched back to the payload via `fileFields[]`.
 */
export interface ParsedRequest {
  payload: Omit<FormSubmissionPayload, "kind">;
  /** Whatever extra payload keys we don't model here (e.g. jobId). */
  raw: Record<string, unknown>;
}

const MAX_TOTAL_FILE_BYTES = 8 * 1024 * 1024; // 8 MB — keep Workers happy.
const MAX_SINGLE_FILE_BYTES = 5 * 1024 * 1024;

interface RawPayload {
  fields?: FormSubmissionPayload["fields"];
  turnstileToken?: string | null;
  pageUrl?: string | null;
  jobId?: string | null;
  jobName?: string | null;
  jobSlug?: string | null;
  /**
   * Form-field names that carry a file in the multipart body. Lets the
   * server resolve file labels without inspecting field types.
   */
  fileFields?: Array<{name: string; label?: string}>;
}

export type SubmissionParseResult =
  | {ok: true; parsed: ParsedRequest}
  | {ok: false; error: string};

export async function parseSubmissionRequest(
  request: Request,
): Promise<SubmissionParseResult> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    let body: RawPayload;
    try {
      body = (await request.json()) as RawPayload;
    } catch {
      return {ok: false as const, error: "invalid-json"};
    }
    if (!Array.isArray(body.fields)) return {ok: false as const, error: "missing-fields"};
    return {
      ok: true as const,
      parsed: {
        payload: {
          jobId: body.jobId ?? null,
          jobName: body.jobName ?? null,
          jobSlug: body.jobSlug ?? null,
          fields: body.fields,
          turnstileToken: body.turnstileToken ?? null,
          pageUrl: body.pageUrl ?? null,
        },
        raw: body as unknown as Record<string, unknown>,
      },
    };
  }

  if (!contentType.includes("multipart/form-data")) {
    return {ok: false as const, error: "unsupported-content-type"};
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return {ok: false as const, error: "invalid-multipart"};
  }

  const payloadJson = formData.get("payload");
  if (typeof payloadJson !== "string") {
    return {ok: false as const, error: "missing-payload"};
  }
  let body: RawPayload;
  try {
    body = JSON.parse(payloadJson) as RawPayload;
  } catch {
    return {ok: false as const, error: "invalid-json"};
  }
  if (!Array.isArray(body.fields)) return {ok: false as const, error: "missing-fields"};

  const files: SubmissionFile[] = [];
  let totalBytes = 0;
  const fileFields = body.fileFields ?? [];
  for (const ff of fileFields) {
    const file = formData.get(ff.name);
    if (!file || typeof file === "string") continue;
    const blob = file as File;
    if (blob.size === 0) continue;
    if (blob.size > MAX_SINGLE_FILE_BYTES) {
      return {ok: false as const, error: `file-too-large:${ff.name}`};
    }
    totalBytes += blob.size;
    if (totalBytes > MAX_TOTAL_FILE_BYTES) {
      return {ok: false as const, error: "files-total-too-large"};
    }
    const bytes = await blob.arrayBuffer();
    files.push({
      fieldName: ff.name,
      fieldLabel: ff.label ?? ff.name,
      filename: blob.name || ff.name,
      mimeType: blob.type || "application/octet-stream",
      bytes,
    });
  }

  return {
    ok: true as const,
    parsed: {
      payload: {
        jobId: body.jobId ?? null,
        jobName: body.jobName ?? null,
        jobSlug: body.jobSlug ?? null,
        fields: body.fields,
        files,
        turnstileToken: body.turnstileToken ?? null,
        pageUrl: body.pageUrl ?? null,
      },
      raw: body as unknown as Record<string, unknown>,
    },
  };
}
