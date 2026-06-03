import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

/** Turns Draft Mode off and returns the visitor to the previous URL. */
export async function GET(request: Request) {
  (await draftMode()).disable();
  const { searchParams } = new URL(request.url);
  redirect(searchParams.get("returnTo") || "/");
}
