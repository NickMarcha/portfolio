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
git tag frontend-v0.0.2
git push origin frontend-v0.0.2
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
git tag backend-v0.0.2
git push origin backend-v0.0.2
```

### Portainer Setup

- **Repo**: `https://github.com/NickMarcha/portfolio`
- **Reference**: `refs/heads/backend-deploy`
- **Compose path**: `portfolio-backend/docker-compose.yml`
- **Auth**: GitHub PAT (Contents read-only)
- **Auto-update**: Enabled (polling, e.g. 5–15 min)
- **Environment**: Set `CLOUDFLARE_TOKEN` in the stack's Environment variables (overrides `stack.env`)

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
- [`portfolio-backend/Dockerfile`](portfolio-backend/Dockerfile): Node 25 Alpine, multi-stage build

---

## Version Tags

Use separate tags so only the changed part redeploys:

- `frontend-v0.0.1` → frontend only
- `backend-v0.0.1` → backend only

Increment independently (e.g. `frontend-v0.0.2`, `backend-v0.0.1`).
