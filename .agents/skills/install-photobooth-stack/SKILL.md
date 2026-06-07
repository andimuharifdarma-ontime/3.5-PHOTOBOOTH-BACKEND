---
name: install-photobooth-stack
description: >-
  Installs and runs the Dovelens photobooth stack from backend-admin/ and
  photobooth-kiosk-app dekstop/. Covers dependencies, env setup, Prisma sync,
  and dev startup for admin panel, NestJS kiosk API, Next.js kiosk UI, and
  Python camera service. Use when the user asks to install, setup, clone, run
  locally, or deploy admin + kiosk from scratch.
---

# Install Photobooth Stack

> Full instructions: see monorepo `skills/install-photobooth-stack/SKILL.md` or install via:
>
> ```bash
> npx skills add . --skill install-photobooth-stack -y
> ```

## Quick start — backend-admin (this folder)

```bash
cd backend-admin
npm install
cp .env.example .env.local
# fill DATABASE_URL, DIRECT_URL, Supabase keys, NEXTAUTH_*
npx prisma db push
npm run create-admin   # first time only
npm run dev            # http://localhost:3003
```

## Environment (minimum)

| Variable | Dev value |
|----------|-----------|
| `DATABASE_URL` | Supabase pooler `:6543?pgbouncer=true` |
| `DIRECT_URL` | Supabase direct `:5432` |
| `NEXTAUTH_URL` | `http://localhost:3003` |
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:3003` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |

## After admin is running

1. Create/copy **API Key** for the kiosk account in admin dashboard.
2. Install kiosk app from sibling folder `photobooth-kiosk-app dekstop/`.
3. Use the **same** `DATABASE_URL` in kiosk `backend/.env`.

## Kiosk sibling paths (from monorepo root)

| Path | Port |
|------|------|
| `photobooth-kiosk-app dekstop/backend` | 3000 |
| `photobooth-kiosk-app dekstop/frontend` | 3001 |
| `photobooth-kiosk-app dekstop/python-camera-service` | 8000 |

For full kiosk install steps, read the combined skill at `../skills/install-photobooth-stack/SKILL.md` (monorepo root).
