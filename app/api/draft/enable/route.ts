import { redirect } from "next/navigation";
import { draftMode } from "next/headers";
import { validatePreviewUrl } from "@sanity/preview-url-secret";
import { sanityClient, SANITY_VIEWER_TOKEN } from "@/lib/sanity";

/**
 * Enables Next.js Draft Mode after Sanity Presentation validates the secret.
 *
 * Studio calls this with `?sanity-preview-secret=<one-time-token>&sanity-preview-pathname=/work/bmw`.
 * We hand the request to `@sanity/preview-url-secret`, which checks the secret
 * against Sanity, returns the resolved redirect path, and we enable draft mode
 * before redirecting the user back into the FE.
 */
export async function GET(request: Request) {
  if (!sanityClient) {
    return new Response("Sanity client not configured", { status: 500 });
  }

  const { isValid, redirectTo = "/" } = await validatePreviewUrl(
    sanityClient.withConfig({ token: SANITY_VIEWER_TOKEN }),
    request.url,
  );

  if (!isValid) {
    return new Response("Invalid preview secret", { status: 401 });
  }

  (await draftMode()).enable();
  redirect(redirectTo);
}
