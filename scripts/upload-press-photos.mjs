// One-shot helper: upload the two press portraits to Sanity assets and
// print their refs so the landing-page docs can reference them.
//
// Usage: node --env-file=.env scripts/upload-press-photos.mjs

import {createClient} from "@sanity/client";
import {readFile} from "node:fs/promises";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
});

if (!process.env.SANITY_WRITE_TOKEN) {
  console.error("Missing SANITY_WRITE_TOKEN env var.");
  process.exit(1);
}

const files = [
  {path: "/tmp/press-group-web.jpg", filename: "press-launch-team-2026.jpg", title: "Brigada team — press launch 2026"},
  {path: "/tmp/press-jens-web.jpg", filename: "jens-mortier-press-2026.jpg", title: "Jens Mortier — Creative Chairman, Brigada"},
];

for (const f of files) {
  const buf = await readFile(f.path);
  const asset = await client.assets.upload("image", buf, {
    filename: f.filename,
    title: f.title,
    contentType: "image/jpeg",
  });
  console.log(`${f.filename}\n  _id: ${asset._id}\n  url: ${asset.url}`);
}
