# Agent Context

Context for AI assistants working on this repo.

## Project Overview

Monorepo: Astro frontend (static, GitHub Pages) + Node/Express backend (Docker, homeserver, Cloudflare Tunnel). Version tags (`frontend-v*`, `backend-v*`) trigger separate deployments.

## Key Paths

| Path | Purpose |
|------|---------|
| `portfolio-frontend/` | Astro site. Content in `src/data/`, `src/content/`, `src/components/projects/` |
| `portfolio-backend/` | Express API. Entry: `src/index.ts`. Docker + cloudflared in `docker-compose.yml` |
| `.github/workflows/` | `deploy-frontend.yml` (tags), `deploy-backend.yml` (tags → backend-deploy branch) |
| `portfolio-backend/stack.env` | Portainer env file. `CLOUDFLARE_TOKEN`, `ADMIN_PASSWORD`, `NTFY_TOKEN`, `NTFY_BASE_URL`, `NTFY_TOPIC` set in Portainer UI, not committed |
| `portfolio-frontend/src/pages/admin.astro` | Secret admin page at `/admin` for visit analytics |

## Conventions

- **Node**: 25 (see `.nvmrc`)
- **Versions**: Start at 0.0.1
- **Tags**: `frontend-v0.0.1`, `backend-v0.0.1`: separate tags avoid cross-deploys
- **Backend deploy**: Workflow pushes to `backend-deploy`; Portainer polls that branch

## Tech Notes

- **Frontend**: Tailwind CSS v4 (`@tailwindcss/vite`). Uses `passthroughImageService()` (no Sharp). Optional dep `@rollup/rollup-linux-x64-gnu` for CI.
- **Carousel**: Project carousel (`ProjectImageCarousel`) supports images, YouTube embeds, and native video (MP4/WebM) via `carouselItems` in `projectData.ts`. Use `client:load` (not `client:visible`) so Embla initializes and buttons work. `embla-carousel-react` is in `optimizeDeps.include` to avoid hydration errors.
- **Backend**: `node:25-slim` in Dockerfile; build tools for `better-sqlite3`. `stack.env` for Portainer. `ADMIN_PASSWORD` required for admin API; set in Portainer stack env (or stack.env).
- **Visit tracking**: Frontend sends `POST /api/visits` with path on each page load (BaseHead). Backend stores in SQLite (`./data/visits.db`), enriches via ip-api.com. Docker volume `visit-data` persists data. ntfy push notifications require `NTFY_TOKEN`, `NTFY_BASE_URL`, `NTFY_TOPIC`; skips if any are missing.
- **Cloudflare**: Public hostname URL is `backend:3000` (no protocol). Tunnel and backend share `tunnel-net`.

## Common Tasks

- **Install**: Run `npm install` (or `npm run install:all`) from repo root: installs both frontend and backend via workspaces.
- **Add project**: Update `portfolio-frontend/src/data/projectData.ts` (including `carouselItems` for images/YouTube/video), add component in `src/components/projects/`
- **View visit analytics**: `/admin` (password from `ADMIN_PASSWORD`). TanStack Table with filters; per-row Enrich for ip-api retry when rate limited.
- **Deploy frontend**: `git tag frontend-v0.0.2 && git push origin frontend-v0.0.2`
- **Deploy backend**: `git tag backend-v0.0.2 && git push origin backend-v0.0.2`
