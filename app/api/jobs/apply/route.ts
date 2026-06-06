import {NextResponse} from "next/server";
import {handleFormSubmission} from "@/lib/form-submit";
import {parseSubmissionRequest} from "@/lib/form-submit-parse";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const result0 = await parseSubmissionRequest(request);
  if (!result0.ok) {
    const errorCode = "error" in result0 ? result0.error : "parse-failed";
    return NextResponse.json({ok: false, error: errorCode}, {status: 400});
  }
  if (!result0.parsed.payload.jobId) {
    return NextResponse.json({ok: false, error: "missing-job"}, {status: 400});
  }
  const result = await handleFormSubmission({
    kind: "job-application",
    ...result0.parsed.payload,
  });
  return NextResponse.json(result, {status: result.ok ? 200 : 400});
}
