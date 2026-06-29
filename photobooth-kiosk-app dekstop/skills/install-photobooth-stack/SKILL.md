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

Install and run **backend-admin** (Next.js admin panel) and **photobooth-kiosk-app** (kiosk frontend + NestJS + Python camera) on a fresh machine.

## Install this skill

From GitHub (this repo):

```bash
npx skills add https://github.com/andimuharifdarma-ontime/photobooth-kiosk-app --skill install-photobooth-stack -y
```

From a local checkout:

```bash
npx skills add . --skill install-photobooth-stack -y
```

Also install skill discovery helper (optional):

```bash
npx skills add https://github.com/vercel-labs/skills --skill find-skills -y
```

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18+ | Required for admin + kiosk |
| npm | 9+ | Default package manager |
| Python | 3.10+ | Camera service only |
| PostgreSQL | via Supabase | Shared by admin + kiosk backend |
| gphoto2 | latest | macOS/Linux DSLR live view (optional in dev) |

## Repository layout

**This repo (photobooth-kiosk-app):**

```
photobooth-kiosk-app/
├── frontend/                  # Kiosk UI (Next.js, port 3001)
├── backend/                   # Kiosk API (NestJS, port 3000)
└── python-camera-service/     # DSLR service (FastAPI, port 8000)
```

**Admin panel (separate repo / sibling folder):**

```
backend-admin/                 # Admin panel (Next.js, port 3003)
```

**Critical:** `backend-admin` and `backend/` (this repo) must use the **same** `DATABASE_URL` (same Supabase project) so kiosk settings, filters, and themes sync with admin.

---

## Part A — backend-admin

> Admin lives outside this repo. Clone/setup separately if not already present.

### A1. Install dependencies

```bash
cd backend-admin
npm install
```

`postinstall` runs `prisma generate` automatically.

### A2. Environment

```bash
cp .env.example .env.local
```

Fill at minimum:

| Variable | Example / notes |
|----------|-----------------|
| `DATABASE_URL` | Supabase pooler port `6543` + `?pgbouncer=true` |
| `DIRECT_URL` | Supabase direct port `5432` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase dashboard |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3003` (dev) |
| `NEXT_PUBLIC_BASE_URL` | Same as `NEXTAUTH_URL` |

Optional: `DOKU_*`, `GOOGLE_*`, `UPSTASH_*`, `CRON_SECRET` (required on Vercel production).

Never commit `.env` or `.env.local`.

### A3. Database sync

```bash
npx prisma db push
npx prisma generate
```

### A4. Create admin user (first time)

```bash
npm run create-admin
```

### A5. Run dev server

```bash
npm run dev
```

Open http://localhost:3003

### A6. Production (Vercel)

- Root directory: `backend-admin`
- Build: `npm run build`
- Set all env vars from `.env.example` in Vercel dashboard
- Production URL example: `https://photobox.dovelensft.com`

---

## Part B — photobooth-kiosk-app (this repo)

### B1. Kiosk NestJS backend

```bash
cd backend
npm install
cp .env.example .env
```

Fill `.env`:

| Variable | Dev default |
|----------|-------------|
| `DATABASE_URL` | **Same Supabase URL as backend-admin** |
| `DIRECT_URL` | **Same as backend-admin** |
| `NEXT_PUBLIC_SUPABASE_URL` | Same project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same project |
| `SUPABASE_SERVICE_ROLE_KEY` | Same project |
| `NEXT_PUBLIC_ADMIN_URL` | `https://photobox.dovelensft.com` or local `http://localhost:3003` |
| `KIOSK_FRONTEND_URL` | `http://localhost:3001` |
| `PORT` | `3000` |

```bash
npx prisma generate
npm run start:dev
```

API: http://localhost:3000

### B2. Python camera service

```bash
cd python-camera-service
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Service: http://localhost:8000

Skip if no DSLR attached; UI still loads but live view/capture will fail until camera is connected.

### B3. Kiosk frontend

```bash
cd frontend
npm install
npm run dev -- -p 3001
```

Open http://localhost:3001

Optional Electron desktop mode:

```bash
npm run desktop
```

### B4. Kiosk API key setup

1. In admin panel → generate/copy **API Key** for the target admin account.
2. On kiosk **Setup** screen, paste API key.
3. Kiosk fetches settings from `GET /kiosk/settings?apiKey=...` every 5s.

Use the API key from the **same admin account** whose settings you edit in the panel.

---

## Verification checklist

Run after both parts are up:

```
Admin
- [ ] http://localhost:3003 loads (or Vercel URL)
- [ ] Login works
- [ ] Filters page saves enabledFilters

Kiosk backend
- [ ] http://localhost:3000/kiosk/settings?apiKey=<key> returns 200
- [ ] enabledFilters + kioskThemePreset match admin account

Kiosk frontend
- [ ] Setup accepts API key → Welcome screen
- [ ] Filter list matches admin enabled filters
- [ ] Theme/buttons match admin kiosk theme preset

Camera (optional)
- [ ] http://localhost:8000 responds
- [ ] Live view visible in capture step
```

Quick DB consistency check (from `backend/` folder):

```bash
node -e "require('dotenv').config();const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.adminUser.findFirst({where:{apiKey:{not:null}},include:{settings:true}}).then(u=>console.log(u?.email,u?.settings?.kioskThemePreset,(u?.settings?.enabledFilters||[]).length)).finally(()=>p.\$disconnect())"
```

---

## Dev port map

| Service | Port |
|---------|------|
| Admin (Next.js) | 3003 |
| Kiosk API (NestJS) | 3000 |
| Kiosk UI (Next.js) | 3001 |
| Camera (Python) | 8000 |

---

## Common issues

| Problem | Fix |
|---------|-----|
| Kiosk settings don't match admin | Same `DATABASE_URL` on admin + kiosk backend; correct API key account |
| `prisma generate` fails | Check `DATABASE_URL`; run from correct app folder |
| CORS errors | NestJS `main.ts` allows kiosk frontend origin; check `KIOSK_FRONTEND_URL` |
| Camera not found | Install `gphoto2`; connect DSLR via USB; run camera service |
| `npm audit fix --force` broke Next | Reinstall pinned version: `npm install next@16.2.6` in frontend |
| Electron slow first run | One-time Electron binary download (~100–150 MB) |

---

## Agent workflow

When the user asks to install or run the stack:

1. Confirm which parts they need: **admin only**, **kiosk only**, or **full stack**.
2. Check Node/Python versions.
3. Walk through Part A and/or Part B in order.
4. Copy env from `.env.example`; never invent secrets.
5. Run verification checklist commands.
6. Report which services are up and which ports to open.
