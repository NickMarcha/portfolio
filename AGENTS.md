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
| `portfolio-backend/stack.env` | Portainer env file. `CLOUDFLARE_TOKEN` set in Portainer UI, not committed |

## Conventions

- **Node**: 25 (see `.nvmrc`)
- **Versions**: Start at 0.0.1
- **Tags**: `frontend-v0.0.1`, `backend-v0.0.1`: separate tags avoid cross-deploys
- **Backend deploy**: Workflow pushes to `backend-deploy`; Portainer polls that branch

## Tech Notes

- **Frontend**: Tailwind CSS v4 (`@tailwindcss/vite`). Uses `passthroughImageService()` (no Sharp). Optional dep `@rollup/rollup-linux-x64-gnu` for CI.
- **Carousel**: Project carousel (`ProjectImageCarousel`) supports images and YouTube embeds via `carouselItems` in `projectData.ts`. Use `client:load` (not `client:visible`) so Embla initializes and buttons work. `embla-carousel-react` is in `optimizeDeps.include` to avoid hydration errors.
- **Backend**: `npm install` in Dockerfile (no package-lock in backend folder). `stack.env` for Portainer.
- **Cloudflare**: Public hostname URL is `backend:3000` (no protocol). Tunnel and backend share `tunnel-net`.

## Common Tasks

- **Install**: Run `npm install` (or `npm run install:all`) from repo root: installs both frontend and backend via workspaces.
- **Add project**: Update `portfolio-frontend/src/data/projectData.ts` (including `carouselItems` for images/YouTube), add component in `src/components/projects/`
- **Deploy frontend**: `git tag frontend-v0.0.2 && git push origin frontend-v0.0.2`
- **Deploy backend**: `git tag backend-v0.0.2 && git push origin backend-v0.0.2`
