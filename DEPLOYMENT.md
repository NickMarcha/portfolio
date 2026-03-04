# Deployment Guide

How frontend and backend are deployed.

## Overview

| Component | Host | Trigger | URL |
|-----------|------|---------|-----|
| Frontend | GitHub Pages | Tag `frontend-v*` | https://portfolio.nickmarcha.com |
| Backend | Homeserver (Docker + Portainer) | Tag `backend-v*` | https://api-portfolio.nickmarcha.com |

---

## Frontend (GitHub Pages)

### Flow

1. Push tag `frontend-v*` (e.g. `frontend-v0.0.2`)
2. GitHub Actions runs [`.github/workflows/deploy-frontend.yml`](.github/workflows/deploy-frontend.yml)
3. Builds Astro, uploads artifact, deploys to GitHub Pages
4. Site is served at https://portfolio.nickmarcha.com

### Deploy

```bash
npm run version -- frontend patch   # or minor/major; bumps version and creates tag
git add portfolio-frontend/package.json
git commit -m "chore: bump frontend to X.Y.Z"
git push origin frontend-vX.Y.Z
```

### Requirements

- **GitHub Pages**: Source = GitHub Actions (Settings → Pages)
- **Environment**: `github-pages` must allow deployments from tags (not just `main`). In Settings → Environments → github-pages → Deployment branches, use "All branches" or a pattern that includes tags.

---

## Backend (Portainer + Cloudflare Tunnel)

### Flow

1. Push tag `backend-v*` (e.g. `backend-v0.0.2`)
2. GitHub Actions runs [`.github/workflows/deploy-backend.yml`](.github/workflows/deploy-backend.yml)
3. Workflow force-pushes current commit to `backend-deploy` branch
4. Portainer polls `backend-deploy`, rebuilds and redeploys the stack
5. Backend runs in Docker; cloudflared exposes it via Cloudflare Tunnel
6. API is reachable at https://api-portfolio.nickmarcha.com

### Deploy

```bash
npm run version -- backend patch   # or minor/major; bumps version, updates compose image tag, creates tag
git add portfolio-backend/package.json portfolio-backend/docker-compose.yml
git commit -m "chore: bump backend to X.Y.Z"
git push origin backend-vX.Y.Z
```

### Portainer Setup

- **Repo**: `https://github.com/NickMarcha/portfolio`
- **Reference**: `refs/heads/backend-deploy`
- **Compose path**: `portfolio-backend/docker-compose.yml`
- **Auth**: GitHub PAT (Contents read-only)
- **Auto-update**: Enabled (polling, e.g. 5–15 min)
- **Environment**: Set `CLOUDFLARE_TOKEN`, `ADMIN_PASSWORD`, and optionally `NTFY_TOKEN`, `NTFY_BASE_URL`, `NTFY_TOPIC` in the stack's Environment variables (overrides `stack.env`). `ADMIN_PASSWORD` is required for the admin API (`/admin` visit analytics). For ntfy push notifications on each visit, set all three: `NTFY_TOKEN`, `NTFY_BASE_URL`, `NTFY_TOPIC`; if any are missing, notifications are skipped.

### Cloudflare Tunnel Setup

1. Create a tunnel in Cloudflare Zero Trust (Networks → Tunnels)
2. Copy the token into Portainer's stack env as `CLOUDFLARE_TOKEN`
3. Add public hostname:
   - **Subdomain**: `api-portfolio`
   - **Domain**: `nickmarcha.com`
   - **Service type**: HTTP
   - **URL**: `backend:3000` (no protocol; Cloudflare adds it)

### Files

- [`portfolio-backend/docker-compose.yml`](portfolio-backend/docker-compose.yml): backend + cloudflared
- [`portfolio-backend/stack.env`](portfolio-backend/stack.env): env template (must exist for repo deploy; real token in Portainer UI)
- [`portfolio-backend/Dockerfile`](portfolio-backend/Dockerfile): Node 25 slim, multi-stage build (build tools for `better-sqlite3`)

---

## Version Management

Use `npm run version` to bump and tag interactively:

```bash
npm run version                    # prompts for target (frontend/backend) and bump type (patch/minor/major)
npm run version -- frontend patch  # non-interactive: bump frontend patch
npm run version -- backend minor  # non-interactive: bump backend minor
```

The script updates the chosen package's `package.json` and, for backend, the `image:` tag in `docker-compose.yml`. It creates the corresponding Git tag (`frontend-vX.Y.Z` or `backend-vX.Y.Z`). Commit the changes and push the tag to deploy.

Version tags are independent; deploy only what changed:

- `frontend-v0.0.8` → frontend only (GitHub Pages)
- `backend-v0.0.8` → backend only (Portainer rebuilds)
