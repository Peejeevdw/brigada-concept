# Brigada

Brigada website — Next.js 16 (App Router) on Cloudflare Workers via OpenNext, Sanity Studio for content.

## Requirements

- Node.js >= 20
- npm (frontend) and pnpm (studio)

## Quick Start

```bash
# Frontend
npm install
npm run dev          # → http://localhost:3000

# Studio (separate terminal)
cd studio
pnpm install
pnpm dev             # → http://localhost:3333
```

Copy `.env.example` to `.env` for the Sanity connection. Recommended: install [direnv](https://direnv.net) and add `dotenv .env` to `.envrc` so the vars are auto-loaded for `claude` / the MCP server.

Sanity variables:

| Variable | Description |
| -------- | ----------- |
| `SANITY_PROJECT_ID` | Sanity project ID, server-side. |
| `SANITY_DATASET` | Dataset to read from, defaults to `production`. |
| `SANITY_API_VERSION` | Content Lake API version, defaults to `2026-04-08`. |
| `SANITY_LOCALE` | Locale document to read for singleton content, defaults to `en`. |
| `SANITY_API_TOKEN` | Used by the Sanity MCP server only (never by the Next.js app). |

> All Sanity queries run server-side in Server Components, so no `NEXT_PUBLIC_` prefix is needed.

## Scripts

**Frontend** — `npm run …`

| Command       | Description                                       |
| ------------- | ------------------------------------------------- |
| `dev`         | Next.js dev server on :3000 (Turbopack)           |
| `build`       | Next.js production build                          |
| `start`       | Serve the production build locally                |
| `preview`     | OpenNext build + Wrangler preview on Cloudflare   |
| `deploy`      | OpenNext build + deploy to Cloudflare Workers     |
| `lint`        | ESLint                                            |
| `types`       | Extract Sanity schema + regenerate types          |

**Studio** — `cd studio && pnpm …`

| Command   | Description                         |
| --------- | ----------------------------------- |
| `dev`     | Studio on :3333                     |
| `build`   | Production build                    |
| `deploy`  | Deploy to Sanity-hosted URL         |

## Project Structure

```
app/                    # Next.js App Router
├── layout.tsx          # Root layout (Providers, fonts, metadata)
├── providers.tsx       # Client-side providers (React Query, transitions, Nav)
├── page.tsx            # / → Concept
├── (site)/             # Route group with shared SiteLayout (Footer)
│   ├── work/           # /work + /work/[slug]
│   ├── expertise/      # /expertise + /expertise/[slug]
│   ├── about/, careers/, contact/
└── privacy/, cookies/, not-found.tsx

src/
├── views/              # Page components (client, render under app/ routes)
├── components/         # Shared components
├── lib/
│   ├── sanity.ts          # Sanity client (server, uses process.env)
│   └── sanity-fetch.ts    # Server-side fetch helpers (server-only)
├── hooks/, data/, types/, integrations/

studio/                 # Sanity Studio v5
```

## Deploy

Cloudflare Workers via [OpenNext](https://opennext.js.org/cloudflare). The Worker is configured in `wrangler.jsonc`:

- `main: .open-next/worker.js` (built by `opennextjs-cloudflare build`)
- `assets.directory: .open-next/assets`
- `compatibility_flags: ["nodejs_compat"]`

Set the Cloudflare project's build settings to:

- Build command: `npm run build`
- Deploy command: `npx opennextjs-cloudflare deploy`

## Content Model

Sanity Studio is set up but the frontend is **not yet wired** to it — `src/data/*` is still authoritative. Migration to live Sanity content is the next milestone.
