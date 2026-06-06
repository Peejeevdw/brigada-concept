import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

/**
 * Sanity → Next revalidation webhook.
 *
 * Busts the "sanity" data cache so published edits show up without a redeploy.
 * Every cached Sanity query is tagged "sanity" (see src/lib/sanity-fetch.ts),
 * so one revalidateTag covers the whole site — simple and correct for a site
 * this size.
 *
 * Setup (one-time) in Sanity → manage.sanity.io → API → Webhooks:
 *   - URL:     https://brigada.be/api/revalidate?secret=<SANITY_REVALIDATE_SECRET>
 *   - Trigger: Create / Update / Delete
 *   - Filter:  (leave empty, or `_type in path("**")`)
 *   - Method:  POST
 * Add the same secret as `SANITY_REVALIDATE_SECRET` in the FE environment.
 */
export async function POST(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret");
  const expected = process.env.SANITY_REVALIDATE_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json(
      { revalidated: false, message: "Invalid or missing secret" },
      { status: 401 },
    );
  }

  // Next 16 requires the cache-profile arg; "max" busts the tag fully.
  revalidateTag("sanity", "max");
  return NextResponse.json({ revalidated: true, tag: "sanity" });
}
