import {NextResponse} from "next/server";
import {headers} from "next/headers";
import {subscribeToNewsletter} from "@/lib/mailcoach";
import {verifyTurnstile} from "@/lib/turnstile";

export const dynamic = "force-dynamic";

interface SubscribePayload {
  email?: string;
  firstName?: string;
  lastName?: string;
  turnstileToken?: string | null;
}

export async function POST(request: Request) {
  let body: SubscribePayload;
  try {
    body = (await request.json()) as SubscribePayload;
  } catch {
    return NextResponse.json({ok: false, error: "invalid-json"}, {status: 400});
  }
  const email = (body.email ?? "").trim();
  if (!email) {
    return NextResponse.json({ok: false, error: "missing-email"}, {status: 400});
  }

  const headerList = await headers();
  const remoteIp =
    headerList.get("cf-connecting-ip") ??
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;

  const verification = await verifyTurnstile(body.turnstileToken, remoteIp);
  if (!verification.success) {
    return NextResponse.json(
      {ok: false, error: `turnstile:${verification.verdict}`},
      {status: 400},
    );
  }

  const result = await subscribeToNewsletter({
    email,
    firstName: body.firstName,
    lastName: body.lastName,
  });
  if (!result.ok) {
    return NextResponse.json(
      {ok: false, error: result.status, message: result.message},
      {status: result.status === "config-missing" ? 500 : 400},
    );
  }
  return NextResponse.json({ok: true, status: result.status});
}
