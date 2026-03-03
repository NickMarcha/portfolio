# Portfolio

Personal portfolio for Nick Marcha: frontend (Astro) and backend (Node/Express) in a monorepo.

## Structure

```
portfolio/
├── portfolio-frontend/   # Astro static site
├── portfolio-backend/    # Express API + Cloudflare tunnel
├── .github/workflows/    # Deploy workflows
├── package.json         # Root scripts (workspaces)
└── .nvmrc               # Node 25
```

## Tech Stack

- **Frontend**: Astro 5, TypeScript, Tailwind CSS, MDX, passthrough image service
- **Backend**: Node 25, Express, TypeScript, SQLite (visit tracking)
- **Deployment**: GitHub Pages (frontend), Docker + Portainer + Cloudflare Tunnel (backend)

## Local Development

Requires [nvm](https://github.com/nvm-sh/nvm) and Node 25.

```bash
nvm use
npm install
npm run dev              # Both frontend and backend
# or
npm run dev:frontend     # Astro at http://localhost:4321
npm run dev:backend      # Express at http://localhost:3000
```

## Scripts

| Script | Action |
|--------|--------|
| `npm run dev` | Run frontend and backend concurrently |
| `npm run dev:frontend` | Astro dev server |
| `npm run dev:backend` | Express dev server (tsx watch) |
| `npm run build` | Build both |
| `npm run build:frontend` | Build Astro for production |
| `npm run build:backend` | Compile TypeScript |
| `npm run test` | Run tests (both workspaces) |

## Live URLs

- **Frontend**: https://portfolio.nickmarcha.com
- **Backend API**: https://api-portfolio.nickmarcha.com
- **Admin** (visit analytics): https://portfolio.nickmarcha.com/admin (password-protected)

## Docs

- [DEPLOYMENT.md](DEPLOYMENT.md): How to deploy frontend and backend
- [AGENTS.md](AGENTS.md): Context for AI assistants
