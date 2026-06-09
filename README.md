# Brigada

Brigada agency website. Next.js 16 (App Router) on Cloudflare Workers via OpenNext, content managed in Sanity Studio v5.

## Stack

- **Frontend**: Next.js 16, React 19, Tailwind 3, framer-motion 12, GSAP (ScrollTrigger), Lenis, HLS.js.
- **CMS**: Sanity v5 — Studio in `studio/`, schemas + Presentation tool with Visual Editing.
- **Hosting**: Cloudflare Workers via [@opennextjs/cloudflare](https://opennext.js.org/cloudflare).

## Requirements

- Node.js >= 20
- `npm` for the frontend, `pnpm` for the Studio
- Sanity project credentials (see [Environment](#environment))

## Quick start

```bash
# Frontend (port 3000)
npm install
npm run dev

# Studio (port 3333) — separate terminal
cd studio
pnpm install
pnpm dev
```

Copy `.env.example` to `.env` and fill in the Sanity variables, or use [`direnv`](https://direnv.net) with `dotenv .env` in your `.envrc`.

## Environment

Two independent `.env` files: one at the repo root for the Next.js frontend, one inside `studio/` for the Sanity Studio + its one-shot scripts. Keeping them split means the Studio can be deployed separately (e.g. `manage.sanity.io` or a different Cloudflare project) and stays self-contained.

> If you use direnv, the root `.envrc` does `dotenv .env`, so root env vars get exported into your shell and `pnpm dev` inside `studio/` will inherit them — but don't rely on that for deploys or for teammates without direnv. Keep `studio/.env` populated.

### Frontend `.env`

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity project ID. Public — appears in every CDN URL we serve. Read on both server and client so SSR + hydration build identical image URLs. |
| `NEXT_PUBLIC_SANITY_DATASET` | Dataset name, defaults to `production`. Same public reason. |
| `SANITY_API_VERSION` | Content Lake API version, defaults to `2026-04-08`. |
| `SANITY_LOCALE` | Default locale code, `en` for now. |
| `SANITY_VIEWER_TOKEN` | Viewer-scoped read token. Required: some doc types (e.g. `job`, imported from Recruitee) aren't readable anonymously. Also enables Draft Mode preview drafts. |
| `SANITY_STUDIO_URL` | Studio base URL for stega click-through, defaults to `http://localhost:3333`. |
| `SANITY_WRITE_TOKEN` | Write-scoped token used by `/api/contact` and `/api/jobs/apply` to store form submissions as `formSubmission` docs. Without it, submissions return `storage-unavailable`. Keep server-side only — never expose in the client bundle. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public site key for the Cloudflare Turnstile widget on the contact + job apply forms. When unset, the widget is skipped (dev convenience) and the API trusts the request — never leave unset in production. |
| `TURNSTILE_SECRET_KEY` | Secret used by the API routes to verify the Turnstile token via `challenges.cloudflare.com/turnstile/v0/siteverify`. Pair with the site key above. |
| `RESEND_API_KEY` | Optional. When set together with `RESEND_FROM_EMAIL` + `CONTACT_EMAIL_TO`, the API routes send a notification email via Resend after a successful submission. Failed sends never block the Sanity backup. |
| `MAILCOACH_API_URL` | Mailcoach API base, e.g. `https://brigada.mailcoach.app/api`. Used by `/api/newsletter/subscribe` to add visitors to the newsletter list. |
| `MAILCOACH_API_TOKEN` | Bearer token issued in Mailcoach → Settings → API tokens. |
| `MAILCOACH_LIST_UUID` | UUID of the target list (e.g. `Brigada-Newsletter-External`). Find it in the Mailcoach admin URL when you open the list. |
| `RESEND_FROM_EMAIL` | `From:` address for the notification email. Must be on a verified Resend domain (e.g. `noreply@brigada.be`). |
| `CONTACT_EMAIL_TO` | Recipient for the notification email (e.g. `hello@brigada.be`). |

### Studio `.env` (in `studio/`)

Used by the Studio (`pnpm dev`, `pnpm build`, `pnpm deploy`) and by the one-shot scripts in `studio/scripts/`.

| Variable | Required for | Description |
|---|---|---|
| `SANITY_STUDIO_PROJECT_ID` | Studio + scripts | Project ID. |
| `SANITY_STUDIO_DATASET` | Studio + scripts | Dataset name, defaults to `production`. |
| `SANITY_STUDIO_PREVIEW_URL` | Studio Presentation | URL of the running Next.js app, defaults to `http://localhost:3000`. |
| `SANITY_API_WRITE_TOKEN` | `seed.ts`, `sync-jobs.ts` | Write-scoped token for the one-shot scripts. Not used by `pnpm dev`. |
| `RECRUITEE_API_URL` | `sync-jobs.ts` | Recruitee API base URL. |
| `RECRUITEE_COMPANY_ID` | `sync-jobs.ts` | Recruitee company ID. |
| `RECRUITEE_API_TOKEN` | `sync-jobs.ts` | Recruitee API token. |

GROQ queries run server-side in Server Components. The image URL builder needs project ID + dataset on the client too so the hydrated DOM matches what the server painted — hence the `NEXT_PUBLIC_*` prefix on those two values.

## Scripts

### Frontend — `npm run …`

| Command | What it does |
|---|---|
| `dev` | Next.js dev server with Turbopack (`http://localhost:3000`). |
| `build` | Production build (`.next`). |
| `start` | Serve the production build locally. |
| `preview` | OpenNext build + Wrangler preview on a local Worker runtime. |
| `deploy` | OpenNext build + deploy to Cloudflare Workers. |
| `lint` | ESLint. |
| `types` | Re-extract the Sanity schema + regenerate TypeScript types. |

### Studio — `cd studio && pnpm …`

| Command | What it does |
|---|---|
| `dev` | Studio dev server (`http://localhost:3333`). |
| `build` | Production build of the Studio. |
| `deploy` | Deploy to the Sanity-hosted Studio URL. |
| `sync-jobs` | One-shot Recruitee → Sanity job import (`studio/scripts/sync-jobs.ts`). |

## Project layout

```
app/                         Next.js App Router
├── layout.tsx               Root layout: fonts, providers, metadata
├── providers.tsx            Client-only providers (PageTransition, ScrollToTop, overlays)
├── page.tsx                 / → Concept (the homepage)
├── api/draft/{enable,disable}/route.ts   Draft Mode endpoints
├── work/, work/[slug]/      /work index + case detail
├── careers/, careers/jobs/, careers/jobs/[slug]/
├── expertise/, brand/, product/, people/, marketing/
├── about/, contact/, privacy/, cookies/
└── not-found.tsx

src/
├── views/                   Page-level client components rendered by app/ routes
├── components/              Shared components
│   ├── case-blocks/         Page-builder block renderers (RichText, ImageGrid, …)
│   ├── site/                SiteNav, SectionLabel, Reveal, …
│   └── DraftModeBanner.tsx  Exit-preview pill + Visual Editing (iframe-gated)
├── lib/
│   ├── sanity.ts            Server Sanity client + urlFor()
│   ├── sanity-fetch.ts      GROQ helpers (getChrome, getHomePage, getWork, …)
│   └── site-chrome.ts       React context for global chrome data
├── hooks/, types/

studio/
├── schemaTypes/             Sanity schemas
│   ├── documents/           work, job, expertise, person, location, menu, legalPage, …
│   ├── singletons/          homePage, aboutPage, careersPage, contactPage, workIndexPage, expertiseIndexPage, siteSettings
│   └── objects/             link, seo, socialLink, submenuItem + blocks/ (richText, sectionImage, imageGrid, videoEmbed, quote, statBlock)
├── structure/               Custom desk structure + per-type filtering
├── components/              Studio UI components (LocaleSlugInput, …)
└── scripts/                 One-shot migrations, seed scripts, sync-jobs
```

## Content model

Everything the frontend renders comes from Sanity — there are no hardcoded content fallbacks. Key docs:

- **`work`** — case studies. Structured chrome (`name`, `client`, `image`, `intro`, `expertises`, `year`, `code`, `gallery`, `related`, `seo`) plus a `body[]` page-builder. Cases are linked from `homePage.cases.items[].work` and from `work.related[]`.
- **`job`** — vacancies (kept in sync with Recruitee via `studio/scripts/sync-jobs.ts`). Carry their own `form` object so each role can ship a custom apply form.
- **`expertise`** — the four pillars (Brand, Product, People, Marketing). Drive `/brand`, `/product`, `/people`, `/marketing`.
- **`person`**, **`location`** — referenced from pillars, contact + careers pages, job docs.
- **`legalPage`** — single doc type with a `kind` discriminator (`privacy`, `cookies`, `terms`, `imprint`).
- **`menu`** — labelled by `identifier` (`main`, `footer`), holds `link[]` items.
- **`link`** — unified link object (`target` = `internal | external | email | phone | anchor`). Replaces the old `linkItem`/`menuItem`/`legalLink` objects.

Singletons (one per locale): `homePage`, `aboutPage`, `careersPage`, `contactPage`, `workIndexPage`, `expertiseIndexPage`, `siteSettings`.

### Page builder

The page-builder field is intentionally scoped to **case detail only** (`work.body`). The singletons stay structured (named fields, no free composition) so editors can't reshape page templates by accident. Available blocks:

| Block | Use |
|---|---|
| `richText` | Portable Text with H2/H3, bullets, etc. |
| `sectionImage` | Single image + caption + variant (inline / full-bleed). |
| `imageGrid` | 2- or 3-column image grid. |
| `videoEmbed` | HLS URL or uploaded file + poster + aspect + autoplay. |
| `quote` | Pull quote with author + role. |
| `statBlock` | Numbers / stats grouped together. |

Add a new block type once in `studio/schemaTypes/objects/blocks/`, register it in `pageBuilderField` (`helpers.ts`), and add the matching renderer in `src/components/case-blocks/`.

### Localisation

Schemas are i18n-ready (each document carries a hidden `locale` field, fields that vary per language use `internationalizedArrayString`), but the site is currently English-only. `studio/structure/constants.ts` lists active locales — append a second entry and the studio + projection plumbing reactivates.

## Draft mode + Studio Presentation

Toggle Draft Mode by hitting `/api/draft/enable` (and `/api/draft/disable` to exit). When Draft Mode is on, server-side fetches switch from the published-perspective client to a `previewDrafts`-perspective client with stega encoding enabled, so editor-facing field paths are embedded into string values.

`<VisualEditing />` is **only mounted when the page is loaded inside an iframe** — i.e. inside Sanity Studio's Presentation tool. The live frontend never shows the click-to-edit overlay, even when Draft Mode is enabled directly. Editing is always initiated from Studio.

## Deploy

Cloudflare Workers via OpenNext. The Worker is configured in `wrangler.jsonc`:

- `main: .open-next/worker.js` — built by `opennextjs-cloudflare build`
- `assets.directory: .open-next/assets`
- `compatibility_flags: ["nodejs_compat"]`

CI build/deploy commands:

```
Build:   npm run build
Deploy:  npx opennextjs-cloudflare deploy
```

Set the same `SANITY_*` environment variables in the Cloudflare dashboard.
