// Replace the press pages hero image with the group portrait.
import {createClient} from "@sanity/client";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
});

const GROUP_ASSET = "image-a68253f56ab3b97aab872bce64ca6d625c86277e-2400x3000-jpg";

const docs = await client.fetch(
  `*[_type == "landingPage" && slug.current in ["press/launch", "press/launch-clients"]]{_id, "slug": slug.current}`,
);

for (const d of docs) {
  await client
    .patch(d._id)
    .set({
      "hero.image": {
        _type: "image",
        asset: {_type: "reference", _ref: GROUP_ASSET},
        alt: "The Brigada team — group portrait, Brussels, May 2026",
      },
    })
    .commit();
  console.log(`${d.slug} → hero image swapped to group portrait`);
}
