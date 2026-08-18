# Knips — Project Instructions

Party photo-challenge web app. Host creates an event, guests scan a QR code,
get a photo task, take a photo, it lands in a shared password-protected gallery.

## Tech Stack

- **Runtime**: Node 22.x (pinned — better-sqlite3 needs prebuilt binaries, Node 24 breaks the build)
- **Backend**: Express 4, better-sqlite3, ESM (`"type": "module"`)
- **Frontend**: Vanilla JS SPA (`public/app.js`), no build step, no framework
- **Styling**: Nocturne dark theme with gold accent (#c9a44e / #e2c479), Inter font, Phosphor icons (CDN)
- **Photos**: Stored on Railway Volume at `/data/uploads` (not in DB)
- **Email**: Resend API (HTTPS, works on all Railway plans). Fallback: SMTP or console log

## Project Structure

```
src/server.js     — Express app, all API routes + SPA fallback + QR poster
src/db.js         — better-sqlite3, migrations, DATA_DIR=/data
src/auth.js       — scrypt hashing, HMAC-signed cookie tokens
src/tasks.js      — 65 photo challenges (TASKS array)
src/mailer.js     — Transactional email (Resend > SMTP > console)
src/pricing.js    — Price tiers, tierForGuests, priceCents

public/index.html — SPA shell
public/app.js     — Client-side router + all screens
public/styles.css — Nocturne + gold theme
public/sw.js      — Service worker (cache-first for shell)
public/manifest.webmanifest
public/icon.svg, icon-maskable.svg — Brand mark (camera + heart lens)
public/landing.html — Marketing page
public/admin.html   — Admin dashboard (Chart.js, ADMIN_TOKEN protected)
public/impressum.html, datenschutz.html, agb.html — Legal pages

railway.json      — Nixpacks builder config
```

## Critical Rules

### SW cache version MUST be bumped on client asset changes
`public/sw.js` uses cache-first for the app shell. Installed PWAs will NOT
pick up changes to app.js/styles.css/index.html unless the VERSION string
in sw.js is incremented. **Always bump VERSION when touching any public/ file.**
Current version: v9.

### Port 3000 is occupied locally
Use port 3210 for local dev (`PORT=3210 npm run dev`). Production uses
Railway's auto-assigned PORT.

### Do NOT loosen the Node engine pin
`engines.node` is `"22.x"`. Railpack defaults to Node 24 which has no
better-sqlite3 prebuilt → build fails with missing Python. Keep it at 22.

### Deploy via Railway CLI
Not GitHub-connected for auto-deploy. Use `railway up --ci` to deploy.
Push to GitHub separately with `git push origin main`.

### Brand: "Knips"
- Name: **Knips**, claim: **"Knips den Moment."**
- Logo: camera silhouette with a heart as the lens, gold on dark
- `BRAND_MARK` const in app.js = inline SVG (stroke/fill=currentColor)
- Heart path uses `transform="translate(256,300) scale(78)"` — do NOT scale a stroked path

### Kleinunternehmer (no VAT)
Legal pages use § 19 UStG (no VAT). All prices are final prices (Endpreise).

## Auth Model

- **Host**: Creates event → gets hostToken (random). Cookie `fch_<id>`.
  Can re-login with join code + host password (`POST /api/host/login`).
- **Guest**: Joins with name + guest password → cookie `fcg_<id>`.
  Same name (case-insensitive) resumes existing guest session.
- **Admin**: `ADMIN_TOKEN` env var, cookie `fca`. Dashboard at `/admin.html`.
- Gallery + images require guest OR host cookie.

## Environment Variables (Railway prod)

```
SESSION_SECRET    — random, signs cookies
DATA_DIR=/data    — Railway Volume mount
NODE_ENV=production
PUBLIC_BASE_URL   — full URL for QR codes / email links
ADMIN_TOKEN       — admin dashboard auth
RESEND_API_KEY    — Resend email API
EMAIL_FROM        — sender address (Knips <noreply@konradthiemann.de>)
RETENTION_DAYS=30 — auto-delete events after N days
```

## Development

```bash
npm install
PORT=3210 npm run dev    # --watch mode, auto-restart
```

No build step. No linter configured. No test runner yet.
CI (.github/workflows/ci.yml) runs `npm ci` + health-check smoke test only.

## Deployment

```bash
git push origin main     # GitHub
railway up --ci          # Railway (separate, not auto-deploy)
```

Railway project: `428d794f`, service: `15d4d882`, volume at `/data`.

## Boundaries — Do NOT touch

- `data/` — Runtime SQLite DB + uploaded photos (gitignored, on Volume in prod)
- `Foto-Challenge Party App/` — Original Claude Design export, read-only reference
- `docs/` — GitHub Pages static site, separate deploy workflow
- `node_modules/`, `package-lock.json` — Don't edit manually, only via npm
- Legal pages (`impressum.html`, `datenschutz.html`, `agb.html`) — Only change on explicit request, contain real personal data

## Conventions

- **API routes**: Always under `/api/`. Return JSON `{error, code}` on failure.
- **Error codes**: snake_case strings (e.g. `not_found`, `bad_password`, `consent_required`).
- **DB migrations**: Inline in `db.js` using `ALTER TABLE` wrapped in try/catch (SQLite has no IF NOT EXISTS for columns).
- **Auth middleware**: `requireHost(req, res)`, `requireGuest(req, res)`, `requireGuestOrHost(req, res)`, `requireAdmin(req, res)` — all in server.js.
- **IDs**: `randomId()` from auth.js (URL-safe, 16 bytes hex).
- **Join codes**: 5-char, alphabet `abcdefghjkmnpqrstuvwxyz23456789` (no ambiguous chars). Stored lowercase, displayed uppercase.
- **Cookies**: Prefix `fch_` (host), `fcg_` (guest), `fca` (admin). HMAC-signed via SESSION_SECRET.
- **Frontend routing**: Hash-free SPA — `navigate(path)` pushes history, `render()` matches `location.pathname`.
- **No TypeScript, no JSDoc, no linter** — keep it vanilla and simple.

## Glossary

| Term | Meaning |
|------|---------|
| **Event** | A party/gathering created by a host. Has a slug, join code, passwords, expiry. DB: `events` table. |
| **Host** | Person who creates an event. Has hostToken + host password. One host per event. |
| **Guest** | Person who joins an event by name + guest password. DB: `guests` table. |
| **Task** | A photo challenge from `src/tasks.js` (65 total). Assigned randomly, can be rotated. |
| **Gallery** | The shared, password-protected photo collection of an event. |
| **Join Code** | 5-char code guests can type instead of scanning the QR / using the full URL. |
| **Retention** | Events + all data auto-delete after RETENTION_DAYS (default 30). |

## Design Tokens (reference)

```
Background:   #0f1119 (deep), #161826 (card/surface), #1e2235 (elevated)
Border:       #262a3d
Text:         #e8eaf2 (primary), #9aa0b5 (muted)
Gold accent:  #c9a44e (primary), #e2c479 (light/hover)
Error:        #e74c3c
Font:         Inter (system fallback: system-ui, -apple-system, sans-serif)
Icons:        Phosphor (regular weight, CDN)
Border-radius: 12-16px (cards), 8-10px (inputs/buttons)
```

## Setup on a new machine

```bash
# 1. Clone
git clone git@github.com:konradthiemann/Foto-Challenge.git
cd Foto-Challenge

# 2. Node (use .nvmrc)
nvm install
nvm use

# 3. Dependencies
npm install

# 4. Environment
cp .env.example .env
# Fill in: SESSION_SECRET (random), DATA_DIR=./data, PORT=3210

# 5. Railway CLI (for deploys)
npm i -g @railway/cli
railway login
railway link  # select project "foto-challenge"

# 6. Run
PORT=3210 npm run dev
```

Everything needed is in the repo. Secrets (`.env`, Railway linking, Resend key)
must be configured per machine — they are never committed.

## Roadmap (planned, not built)

- **Payment**: Stripe Checkout for events >5 guests → see `docs/stripe-plan.md` when ready
- **Image optimization**: sharp resize on upload (max 1920px) to save volume space
- **Tests**: Node 22 built-in test runner, API-level smoke tests
- **Marketing**: Landing page exists, social media accounts TBD
