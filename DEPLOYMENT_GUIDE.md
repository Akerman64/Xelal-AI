# Deployment Guide

## Recommended stack

- frontend: Vercel
- backend API: Render Web Service
- database: Neon Postgres

This setup keeps the product simple to operate:

- Vercel is a strong fit for the current Vite frontend
- Render is straightforward for a Node/Express backend with Git-based deploys
- Neon gives us managed Postgres with standard connection strings and branching

## Current backend status

The backend now supports two persistence modes:

- `memory`: default when `DATABASE_URL` is not set
- `prisma`: enabled automatically when `DATABASE_URL` is set

You can verify the active mode at:

```bash
curl http://localhost:4000/api/health
```

Look for:

```json
{
  "persistence": {
    "mode": "memory",
    "databaseConfigured": false
  }
}
```

## Local Postgres or Neon

Set `DATABASE_URL` in a local `.env` file:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?sslmode=require"
```

For a local Postgres, `sslmode=require` is usually not needed.

Then run:

```bash
npm run prisma:generate
npm run prisma:db:push
npm run prisma:seed
```

After that, restart the backend:

```bash
npm run backend:dev
```

## Neon setup

1. Create a Neon project.
2. Create or choose a database.
3. Copy the Postgres connection string.
4. Put it in `.env` as `DATABASE_URL`.
5. Run:

```bash
npm run prisma:generate
npm run prisma:db:push
npm run prisma:seed
```

## Render backend

Create a new Web Service from the GitHub repo.

Recommended settings:

- Runtime: `Node`
- Build Command: `npm install && npm run prisma:generate && npm run backend:build`
- Start Command: `npm run backend:start`

Environment variables to set on Render:

- `NODE_ENV=production`
- `BACKEND_PORT=10000`
- `APP_NAME=Xelal AI API`
- `APP_URL=https://your-frontend-domain.vercel.app`
- `API_BASE_URL=https://your-backend-service.onrender.com`
- `AUTH_SECRET=...`
- `DATABASE_URL=...`
- `OPENAI_API_KEY=...`
- `WHATSAPP_VERIFY_TOKEN=...`
- `WHATSAPP_PHONE_NUMBER_ID=...`
- `WHATSAPP_ACCESS_TOKEN=...`

## Vercel frontend

Import the same GitHub repo into Vercel.

Recommended settings:

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

Environment variables to set on Vercel:

- `VITE_API_BASE_URL=https://your-backend-service.onrender.com`

## First production checklist

1. Create Neon database.
2. Set `DATABASE_URL` locally.
3. Run `prisma:generate`, `prisma:db:push`, `prisma:seed`.
4. Validate `/api/health` shows `"mode": "prisma"`.
5. Deploy backend on Render.
6. Deploy frontend on Vercel.
7. Set `VITE_API_BASE_URL` to Render URL.
8. Re-test admin login, teacher login, notes, absences, invitations.

## Why this is maintainable

- one repo
- modular monolith backend
- Prisma as the single persistence layer
- frontend and backend deploy independently
- easy to add Redis, WhatsApp workers, and AI jobs later without rewriting the core
