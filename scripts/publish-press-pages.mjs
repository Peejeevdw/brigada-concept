// One-shot helper: write the two press release landing pages.
//
// - Replaces the existing /press/launch (id 876de935-...) with PRESS 1 copy
// - Creates a new /press/launch-clients landingPage with the clients copy
//
// Both share the two press portraits (group + Jens) already uploaded in
// scripts/upload-press-photos.mjs.
//
// Usage: node --env-file=.env scripts/publish-press-pages.mjs

import {createClient} from "@sanity/client";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
});

const GROUP_ASSET = "image-a68253f56ab3b97aab872bce64ca6d625c86277e-2400x3000-jpg";
const JENS_ASSET = "image-f7944ad85c1ea1da760c735475ba0ddd75e7bbcc-2000x3000-jpg";

function block(key, style, text) {
  return {
    _type: "block",
    _key: key,
    style,
    markDefs: [],
    children: [{_type: "span", _key: `${key}s`, text, marks: []}],
  };
}
function richText(key, blocks, width = "medium") {
  return {_type: "richText", _key: key, width, body: blocks};
}
function quote(key, text, author, role) {
  return {_type: "quote", _key: key, text, author, role};
}
function sectionImage(key, assetRef, alt, caption, variant = "inline") {
  return {
    _type: "sectionImage",
    _key: key,
    variant,
    image: {_type: "image", asset: {_type: "reference", _ref: assetRef}, alt},
    caption,
  };
}

// ---------- PRESS 1 ----------

const press1Body = [
  richText("p1-intro", [
    block("p1-b1", "normal",
      "Brussels, 16 June 2026 — Twenty years after mortierbrigade launched to shake up the Belgian agency landscape, the agency and its five sister agencies are entering a new chapter. Today, it launches under a new name: Brigada."),
    block("p1-b2", "normal",
      "The move brings together mortierbrigade, Today, Who Owns The Zebra, Onlyhumans, Fantastic and the B2B activities of meetmarcel under one brand. While the agencies have collaborated for years as part of the 62MILES group, led by CEO Arjan Pomper, Brigada marks a new phase in their evolution, with one leadership team and one way of working."),
  ]),
  quote("p1-jens-quote",
    "Two decades ago, we challenged the conventions of our industry. Today's challenges require us to do it again: with the same entrepreneurial and rebellious spirit.",
    "Jens Mortier", "Founder of mortierbrigade · Creative Chairman, Brigada"),
  sectionImage("p1-jens", JENS_ASSET,
    "Jens Mortier, founder of mortierbrigade and Creative Chairman of Brigada",
    "Jens Mortier, Creative Chairman of Brigada", "inline"),
  richText("p1-built", [
    block("p1-b3", "normal",
      "Built for a market that demands a new kind of agency, Brigada believes expertise should move around the client, not the other way around."),
  ]),
  quote("p1-pomper-quote",
    "The challenges clients bring us are increasingly complex and fluid. A brand challenge may have its roots in product. A product challenge may stem from culture. A marketing challenge may reveal a bigger business opportunity. Our job is to connect those dots sooner and bring together the right people, perspectives and disciplines to a challenge from day one.",
    "Arjan Pomper", "CEO, Brigada"),
  richText("p1-senta", [
    block("p1-b4", "normal",
      "To help lead that transformation, Brigada has appointed Senta Slingerland as Chief Strategy Officer. Slingerland brings international experience in strategy, innovation and transformation, having worked with organisations including Coca-Cola, Accenture Song, Google and Amazon. As Director of Brand Strategy at Cannes Lions, she had a front-row seat to how the world's most creative organisations navigate change. Later at MESA, she helped organisations do exactly that, bringing together people from different disciplines to solve complex business problems."),
    block("p1-b5", "normal",
      "Brigada offers four interconnected services — Brand, Marketing, Product and People — and combines the depth of six specialist businesses with the flexibility of a single team of more than 150 experts. The result is a genuinely multidisciplinary agency, built to solve problems rather than sell disciplines."),
  ]),
  quote("p1-senta-quote-1",
    "What is quite unique about Brigada, is that it's genuinely made up of leading experts in branding, design, advertising, digital products, growth, experiential, people and culture, and that as a result, we are discipline-agnostic. What matters is finding the right solution, not pushing a particular capability.",
    "Senta Slingerland", "Chief Strategy Officer, Brigada"),
  sectionImage("p1-team", GROUP_ASSET,
    "The Brigada team — group portrait, Brussels, May 2026",
    "The Brigada team, Brussels — May 2026", "full-bleed"),
  richText("p1-sharp", [
    block("p1-b6", "normal",
      "The agency launches with a simple belief: Sharp Beats Loud."),
  ]),
  quote("p1-senta-quote-2",
    "As complexity grows, organisations often respond by adding. Another campaign. Another platform. Another agency. Before long, everyone is busy, but no one is moving forward.",
    "Senta Slingerland", "Chief Strategy Officer, Brigada"),
  richText("p1-close", [
    block("p1-b7", "normal", "Brigada exists to change that."),
  ]),
];

const press1Doc = {
  _id: "876de935-32f1-40e1-89e2-4d698727d76d",
  _type: "landingPage",
  title: "Press launch — Brigada (Press 1)",
  slug: {_type: "slug", current: "press/launch"},
  noindex: true,
  hero: {
    eyebrow: "Press release · 16 June 2026",
    title: "Mortierbrigade and five sister agencies launch Brigada",
    intro:
      "Twenty years after mortierbrigade shook up the Belgian agency landscape, the founding agency and five sister businesses unite under one brand — and appoint former Cannes Lions executive Senta Slingerland as Chief Strategy Officer.",
    image: {
      _type: "image",
      asset: {_type: "reference", _ref: "image-a3f841715e6c4064b29df2dc0e37a24d5c2d7fc1-1376x768-jpg"},
    },
  },
  seo: {
    title: "Brigada launches — June 16 2026 press release",
    description:
      "Mortierbrigade and five sister agencies unite under a new brand, Brigada, with Senta Slingerland appointed Chief Strategy Officer.",
  },
  body: press1Body,
};

// ---------- PRESS CLIENTS ----------

const pressClientsBody = [
  richText("pc-intro", [
    block("pc-b1", "normal",
      "Brussels, 16 June 2026 — There's a new agency in town and it's called Brigada."),
    block("pc-b2", "normal",
      "Brigada brings together the expertise of mortierbrigade, Today, Who Owns The Zebra, Onlyhumans, Fantastic, and the B2B arm of meetmarcel under a single banner, creating a 150-strong team of specialists in branding, advertising, performance, digital products, experience and employer branding. High-end private events will continue to operate under the meetmarcel brand."),
    block("pc-b3", "normal",
      "Built for a market that demands a new kind of agency, Brigada believes expertise should move around the client, not the other way around."),
  ]),
  quote("pc-pomper",
    "The challenges clients bring us are increasingly complex and fluid. A brand challenge may have its roots in product. A product challenge may stem from culture. A marketing challenge may reveal a bigger business opportunity. Our job is to connect those dots sooner and put together the right people, perspectives and disciplines to a challenge from day one.",
    "Arjan Pomper", "CEO, Brigada"),
  sectionImage("pc-team", GROUP_ASSET,
    "The Brigada team — group portrait, Brussels, May 2026",
    "The Brigada team, Brussels — May 2026", "full-bleed"),
  richText("pc-ambition", [
    block("pc-h1", "h2", "New ambition, new talent"),
    block("pc-b4", "normal",
      "Previously, the six agencies already formed the 62MILES group. Brigada marks the next step in that evolution: one brand, one way of working, and one leadership team, which the business has strengthened with international experience over the past ten months. Last year it hired CEO Arjan Pomper and more recently Chief Strategy Officer Senta Slingerland. Joost Berends becomes Chief Creative Officer, Evert Vermeire Chief Commercial Officer. Mortierbrigade founder Jens Mortier will serve as Creative Chairman."),
    block("pc-b5", "normal",
      "Slingerland brings international experience in strategy, innovation and transformation, having worked with organisations including Coca-Cola, Accenture Song, Google and Amazon. As Director of Brand Strategy at Cannes Lions, she had a front-row seat to how the world's most creative organisations navigate change. Later at MESA, she helped organisations do exactly that, bringing together people from different disciplines to solve complex business problems."),
  ]),
  sectionImage("pc-jens", JENS_ASSET,
    "Jens Mortier, founder of mortierbrigade and Creative Chairman of Brigada",
    "Jens Mortier, Creative Chairman of Brigada", "inline"),
  richText("pc-model", [
    block("pc-h2", "h2", "A new model"),
    block("pc-b6", "normal",
      "Brigada offers four interconnected services — Brand, Marketing, People and Product — and combines the depth of six specialist businesses. The result is a genuinely multidisciplinary agency, built to solve problems rather than sell disciplines."),
  ]),
  quote("pc-senta-1",
    "What is quite unique about Brigada, is that it's genuinely made up of leading experts in branding, design, advertising, digital products, growth, experiential, people and culture, and that as a result, we are discipline-agnostic. What matters is finding the right solution, not pushing a particular capability.",
    "Senta Slingerland", "Chief Strategy Officer, Brigada"),
  richText("pc-sharp", [
    block("pc-h3", "h2", "Sharp Beats Loud"),
    block("pc-b7", "normal",
      "The agency launches with a simple belief: Sharp Beats Loud."),
  ]),
  quote("pc-senta-2",
    "As complexity grows, organisations often respond by adding. Another campaign. Another platform. Another agency. Before long, everyone is busy, but no one is moving forward.",
    "Senta Slingerland", "Chief Strategy Officer, Brigada"),
  richText("pc-close", [
    block("pc-b8", "normal", "Brigada exists to change that."),
  ]),
];

const pressClientsDoc = {
  _type: "landingPage",
  title: "Press launch — Brigada (clients)",
  slug: {_type: "slug", current: "press/launch-clients"},
  noindex: true,
  hero: {
    eyebrow: "Press release · 16 June 2026",
    title: "A new agency for brands tired of doing more and growing less",
    intro:
      "There's a new agency in town and it's called Brigada — a 150-strong team built to solve problems, not sell disciplines.",
  },
  seo: {
    title: "Brigada — a new agency for ambitious brands · June 16 2026",
    description:
      "Mortierbrigade and five sister agencies unite as Brigada — 150 specialists, four practices, one team built around the client.",
  },
  body: pressClientsBody,
};

// ---------- Write ----------

console.log("Replacing /press/launch …");
await client.createOrReplace(press1Doc);
console.log("  ok");

console.log("Looking up existing /press/launch-clients …");
const existing = await client.fetch(
  `*[_type == "landingPage" && slug.current == "press/launch-clients"][0]{_id}`,
);
if (existing?._id) {
  console.log(`  exists (${existing._id}) — replacing in place`);
  await client.createOrReplace({...pressClientsDoc, _id: existing._id});
} else {
  console.log("  not found — creating new doc");
  const created = await client.create(pressClientsDoc);
  console.log(`  created _id: ${created._id}`);
}

console.log("\nDone. Both pages are published, both noindex=true.");
console.log("Flip noindex off in Studio when the embargo lifts on 16 June.");
