// Remove inline/full-bleed sectionImage blocks from /press/launch-clients body.
// The hero image stays.
import {createClient} from "@sanity/client";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
});

const slug = "press/launch-clients";
const doc = await client.fetch(
  `*[_type == "landingPage" && slug.current == $slug][0]{_id, body}`,
  {slug},
);
if (!doc?._id) {
  console.error("Doc not found");
  process.exit(1);
}

const before = doc.body.length;
const filtered = doc.body.filter((b) => b._type !== "sectionImage");
const removed = before - filtered.length;

await client.patch(doc._id).set({body: filtered}).commit();
console.log(`${slug}: removed ${removed} sectionImage block(s), ${filtered.length} blocks remain.`);
