# Agent Context

Context for AI assistants working on this repo.

## Project Overview

Monorepo: Astro frontend (static, GitHub Pages) + Node/Express backend (Docker, homeserver, Cloudflare Tunnel). Version tags (`frontend-v*`, `backend-v*`) trigger separate deployments.

## Key Paths

| Path | Purpose |
|------|---------|
| `portfolio-frontend/` | Astro site. Content in `src/data/`, `src/content/`, `src/components/projects/` |
| `portfolio-frontend/src/i18n/` | i18n: `index.ts` (t, getProjectContent, getLangFromUrl, withLang), `ui/*.json`, `projects/*.json` |
| `portfolio-frontend/src/data/projectData.ts` | Project structure (slug, carouselItems, searchKeywords). Translatable content in `i18n/projects/*.json` |
| `portfolio-frontend/src/components/SearchCommand.tsx` | shadcn Command (cmdk) for project search + language/theme shortcuts |
| `portfolio-frontend/src/components/ShareButton.astro` | Share (Web Share API / copy), QR code overlay (pre-built SVGs) |
| `portfolio-frontend/src/components/ExternalLink.tsx` | Links with live/archived options; popover on desktop, inline on mobile |
| `portfolio-frontend/scripts/generate-qr.mjs` | Build-time QR generation. Output: `public/qr/home-{lang}.svg`, `projects-{slug}-{lang}.svg` |
| `portfolio-backend/` | Express API. Entry: `src/index.ts`. Docker + cloudflared in `docker-compose.yml` |
| `.github/workflows/` | `deploy-frontend.yml` (tags), `deploy-backend.yml` (tags → backend-deploy branch) |
| `portfolio-backend/stack.env` | Portainer env file. `CLOUDFLARE_TOKEN`, `ADMIN_PASSWORD`, `NTFY_TOKEN`, `NTFY_BASE_URL`, `NTFY_TOPIC` set in Portainer UI, not committed |
| `portfolio-frontend/src/pages/admin.astro` | Secret admin page at `/admin` for visit analytics |

## Conventions

- **Node**: 25 (see `.nvmrc`)
- **Versions**: Independent per package. Use `npm run version` to bump frontend or backend and create tags.
- **Tags**: `frontend-v0.0.1`, `backend-v0.0.1`: separate tags avoid cross-deploys
- **Backend deploy**: Workflow pushes to `backend-deploy`; Portainer polls that branch

## Tech Notes

- **Frontend**: Tailwind CSS v4 (`@tailwindcss/vite`). Uses `passthroughImageService()` (no Sharp). Optional dep `@rollup/rollup-linux-x64-gnu` for CI.
- **Carousel**: Project carousel (`ProjectImageCarousel`) supports images, YouTube embeds, and native video (MP4/WebM) via `carouselItems` in `projectData.ts`. Use `client:load` (not `client:visible`) so Embla initializes and buttons work. `embla-carousel-react` is in `optimizeDeps.include` to avoid hydration errors. Captions come from `carouselCaptions` in `i18n/projects/*.json` (keyed by carousel item index).
- **Backend**: `node:25-slim` in Dockerfile; build tools for `better-sqlite3`. `stack.env` for Portainer. `ADMIN_PASSWORD` required for admin API; set in Portainer stack env (or stack.env).
- **Visit tracking**: Frontend sends `POST /api/visits` with path on each page load (BaseHead). Backend stores in SQLite (`./data/visits.db`), enriches via ip-api.com. Docker volume `visit-data` persists data. ntfy push notifications require `NTFY_TOKEN`, `NTFY_BASE_URL`, `NTFY_TOPIC`; skips if any are missing.
- **Cloudflare**: Public hostname URL is `backend:3000` (no protocol). Tunnel and backend share `tunnel-net`.

## i18n (Internationalization)

- **Path-based locales**: `/` (en), `/no/`, `/es/`, `/projects/bio` (en), `/no/projects/bio`, `/es/projects/bio`. Each locale = separate static HTML at build time.
- **Page structure**: `index.astro` (en), `no/index.astro`, `es/index.astro`; `projects/[slug].astro` (en), `no/projects/[slug].astro`, `es/projects/[slug].astro`. Blog at `/blog` (en only).
- **Config**: `astro.config.mjs` has `i18n: { defaultLocale: 'en', locales: ['en','no','es'], routing: { prefixDefaultLocale: false } }`.
- **Helpers**: `getLangFromUrl(url)` (from pathname), `getPathWithoutLocale(url)`, `useTranslatedPath(lang)`, `withLang(path, lang)`, `t(key, lang)`, `getProjectContent(slug, lang)`.
- **Content**: `src/i18n/ui/*.json` (UI strings), `src/i18n/projects/*.json` (per-project: shortTitle, shortDescription, longTitle, body, carouselCaptions). Missing `body` falls back to default locale.
- **Layout**: Top-left LanguageButton, top-right GitHubButton, bottom-left ShareButton, bottom-right ThemeToggle. All receive `lang` and use `t()` for labels.

## Search

- **SearchCommand** (shadcn Command/cmdk): Search button beside "Projects" on homepage. Filters by `shortTitle`, `shortDescription`, `searchKeywords` from `projectData` + `getProjectContent`. Also includes Language and Theme options for redundancy.
- **Index**: Built from `projectData` + `getProjectContent(slug, lang)` at page render. Uses `client:load`.

## Share

- **ShareButton**: Fixed bottom-left. Mobile: Web Share API + Copy link + Show QR. Desktop: Copy link + Show QR. No Facebook/Twitter share buttons.
- **QR codes**: Pre-generated at build (`npm run generate-qr` in prebuild). `public/qr/home-{lang}.svg`, `public/qr/projects-{slug}-{lang}.svg`. Path-based URLs (e.g. `https://portfolio.nickmarcha.com/no/projects/bio`).
- **QR overlay**: Full-screen modal; Language/GitHub/Theme buttons render underneath (lower z-index).

## ExternalLink (Live + Archived)

- **ExternalLink.tsx**: For links that may have live and archived versions. Props: `liveHref`, `archivedHref`, `label`, `lang`.
- **Desktop**: Popover with "Open live" / "Open archived" options.
- **Mobile**: Inline "Label" + " (archived)" when both exist. Single link when only one href.
- **Labels**: Use `t('openLive', lang)`, `t('openArchived', lang)`, `t('archived', lang)` from UI JSON.

## Other Notes

- **Blog**: Deprecated for now; i18n basics in place (lang from path, `t()` for UI). Blog post content (markdown) stays English-only.
- **Admin**: Stays English; no i18n.

## AI Writing Avoidance

**Canonical reference:** [docs/Signs_of_AI_writing.md](docs/Signs_of_AI_writing.md)

When writing **significant text** (anything beyond a couple words—e.g. button labels, short UI strings), read the reference file first. It lists patterns of AI writing to avoid. Apply these as rules. Do NOT start writing yet—ask clarifying questions first.

Skip this step for trivial copy: a few words for buttons, links, headings, or similar.

## Design Guidelines (Uncodixfy)

**Canonical reference:** [docs/Uncodixfy.md](docs/Uncodixfy.md)

When styling the frontend (Astro + Tailwind), follow the Uncodexy-UI standard. Avoid Codex UI patterns: soft gradients, floating panels, eyebrow labels, oversized radii, transform animations, dramatic shadows.

**Quick reference:**
- **Measurements:** Sidebar 240–260px; radius 8–12px max; shadows ≤8px blur; transitions 100–200ms
- **Typography:** System or simple sans-serif; 14–16px body; no serif+sans combo; no Inter/Roboto/Arial unless already used
- **Colors:** Use existing project colors first; else pick from predefined palettes in Uncodixfy.md; avoid blue-leaning; prefer dark muted tones
- **Banned:** Eyebrow labels (`<small>`), pill shapes, glassmorphism, hero sections in dashboards, gradient backgrounds, decorative copy
- **Inspiration:** Linear, Raycast, Stripe, GitHub—functional, not decorative

## Common Tasks

- **Install**: Run `npm install` (or `npm run install:all`) from repo root: installs both frontend and backend via workspaces.
- **Add project**: Update `portfolio-frontend/src/data/projectData.ts` (including `carouselItems`, `searchKeywords` for images/YouTube/video), add `shortTitle`, `shortDescription`, `longTitle`, optional `body`, `carouselCaptions` in `src/i18n/projects/en.json` (and no.json, es.json). Add DescriptionComponent in `src/components/projects/` if not using `body`. Add slug to `scripts/generate-qr.mjs` projectSlugs.
- **View visit analytics**: `/admin` (password from `ADMIN_PASSWORD`). TanStack Table with filters; per-row Enrich for ip-api retry when rate limited.
- **Deploy frontend**: `npm run version -- frontend patch` (or `minor`/`major`), then commit and `git push origin frontend-vX.Y.Z`
- **Deploy backend**: `npm run version -- backend patch` (or `minor`/`major`), then commit and `git push origin backend-vX.Y.Z`
