// Flip noindex=false on both press landing pages — the whole site is still
// gated behind Cloudflare Access, so search engines can't reach them anyway.
import {createClient} from "@sanity/client";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
});

const slugs = ["press/launch", "press/launch-clients"];
const docs = await client.fetch(
  `*[_type == "landingPage" && slug.current in $slugs]{_id, "slug": slug.current}`,
  {slugs},
);
for (const d of docs) {
  await client.patch(d._id).set({noindex: false}).commit();
  console.log(`${d.slug} → noindex=false`);
}
