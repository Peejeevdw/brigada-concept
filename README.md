# Brigada

Brigada website — Vite + React frontend, Sanity Studio for content.

## Requirements

- Node.js >= 20
- npm (frontend) and pnpm (studio)

## Quick Start

```bash
# Frontend
npm install
npm run dev          # → http://localhost:8080

# Studio (separate terminal)
cd studio
pnpm install
pnpm dev             # → http://localhost:3333
```

Copy `.env.example` to `.env.local` for the frontend Sanity connection.
Copy `studio/.env.example` to `studio/.env` to override the Studio connection.

Frontend Sanity variables:

| Variable | Description |
| -------- | ----------- |
| `VITE_SANITY_PROJECT_ID` | Public Sanity project ID used by the website. |
| `VITE_SANITY_DATASET` | Dataset to read from, defaults to `production`. |
| `VITE_SANITY_API_VERSION` | Content Lake API version, defaults to `2026-04-08`. |
| `VITE_SANITY_LOCALE` | Locale document to read for singleton content, defaults to `en`. |

## Scripts

**Frontend** — `npm run …`

| Command       | Description                |
| ------------- | -------------------------- |
| `dev`         | Dev server on :8080        |
| `build`       | Production build           |
| `preview`     | Preview production build   |
| `lint`        | ESLint                     |
| `test`        | Vitest                     |

**Studio** — `cd studio && pnpm …`

| Command   | Description                         |
| --------- | ----------------------------------- |
| `dev`     | Studio on :3333                     |
| `build`   | Production build                    |
| `deploy`  | Deploy to Sanity-hosted URL         |

## Project Structure

```
src/                    # Frontend (Vite + React + Tailwind + shadcn-ui)
├── components/         # Shared components (ui/ = shadcn primitives)
├── pages/              # Route components
├── data/               # Static content (source of truth until Sanity wiring)
└── App.tsx, main.tsx

studio/                 # Sanity Studio v5
├── schemaTypes/
│   ├── singletons/     # homePage, aboutPage, careersPage, contactPage
│   ├── documents/      # work, expertise, lead, location, locale
│   └── objects/        # linkItem + page-builder blocks (hero, textblock, selectedWork)
├── structure/          # Custom desk (singletons + admin-only locale)
├── templates.ts        # Per-locale singleton templates
└── sanity.config.ts    # Plugins, i18n, env-driven project ID
```

## Content Model

- **Pages** (Home / About / Careers / Contact) — singletons composed of PageBuilder blocks.
- **Resources** (Work / Expertise / Lead / Location) — referenced by pages.

> Frontend is not yet wired to Sanity — `src/data/*` is still authoritative.
