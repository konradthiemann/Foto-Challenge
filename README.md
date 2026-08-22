# 📸 Foto-Challenge

**Party photo-challenge web app** — Gäste scannen einen QR-Code, geben ihren Namen ein, bekommen eine Foto-Aufgabe, machen ein Foto und es landet in einer gemeinsamen, passwortgeschützten Event-Galerie.

🚀 **Landingpage:** <https://knips.konradthiemann.de/landing>
🌐 **Live-App:** <https://knips.konradthiemann.de>
📖 **Dokumentation:** <https://konradthiemann.github.io/Foto-Challenge/>

[![CI](https://github.com/konradthiemann/Foto-Challenge/actions/workflows/ci.yml/badge.svg)](https://github.com/konradthiemann/Foto-Challenge/actions/workflows/ci.yml)
[![Docs](https://github.com/konradthiemann/Foto-Challenge/actions/workflows/pages.yml/badge.svg)](https://github.com/konradthiemann/Foto-Challenge/actions/workflows/pages.yml)
![Node.js 22.x](https://img.shields.io/badge/Node.js-22.x-339933?logo=nodedotjs&logoColor=white)
![Express 4](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003B57?logo=sqlite&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa&logoColor=white)
![Railway](https://img.shields.io/badge/Deploy-Railway-0B0D0E?logo=railway&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

---

## 🎯 About

Foto-Challenge ist eine Web-App für Partys, Hochzeiten und Feiern. Der Gastgeber legt eine Session an und erhält einen druckbaren QR-Code-Poster, das er mehrfach in der Halle aufhängen kann. Gäste scannen den Code, geben ihren Namen ein und bekommen aus einem Pool von 207 Foto-Aufgaben eine gestellt – Aufgaben, die die Gemeinschaft stärken und nie peinlich sind. Jedes Foto landet in einer gemeinsamen Galerie, die per Passwort geschützt ist, damit Fremde nicht mitschauen können.

**Kernziele:**
- Denkbar niedrige Einstiegshürde für Gäste: QR scannen → Name → Aufgabe → Foto. Kein App-Download, keine Registrierung.
- Fotos sind auth-geschützt und best-effort nicht herunterladbar (kein Download-UI, deaktiviertes Kontextmenü/Drag).
- Leichtgewichtiges Deployment ohne Build-Step: server-gerenderte SPA-Shell + Vanilla JS.
- Installierbar als PWA mit Offline-App-Shell.

---

## ✨ Features

- **Gastgeber-Flow:** Event erstellen (Name, Gästezahl, Galerie- & Gast-Passwort), Dashboard mit Übersicht/Galerie/Einladen-Tabs.
- **Druckbares QR-Poster:** `GET /host/:id/print?t=<token>` rendert ein aufhängbares Poster mit QR-Code, der auf `PUBLIC_BASE_URL/{eventId}` zeigt.
- **Gast-Flow:** Beitreten mit Name (+ Gast-Passwort) → Aufgabe erhalten → Aufgabe rotieren → Foto aufnehmen → Erfolg → Galerie.
- **207 Foto-Aufgaben** (siehe [`src/tasks.js`](src/tasks.js)), kuratiert und kategorisiert, gemeinschaftsstärkend statt peinlich.
- **Passwortgeschützte Galerie:** Fotos werden nur mit gültigem Gast- oder Gastgeber-Cookie inline ausgeliefert; Fremde werden geblockt.
- **PWA:** Web-Manifest, Service Worker (App-Shell-Caching, network-first für Navigation), iOS-Homescreen-Icon.

---

## 🧰 Technology Stack

- **Runtime:** Node.js `22.x` (in `package.json` `engines` gepinnt — better-sqlite3 & sharp liefern Prebuilt-Binaries für 22, kein nativer Compile beim Deploy)
- **Server:** Express 4 (ESM, `"type": "module"`)
- **Datenbank:** SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- **Auth:** scrypt-Passwort-Hashing + HMAC-signierte Cookie-Tokens (`SESSION_SECRET`)
- **Uploads:** [multer](https://github.com/expressjs/multer) v2 → Fotos auf Railway-Volume (`DATA_DIR`)
- **QR-Codes:** [qrcode](https://github.com/soldair/node-qrcode)
- **Bildverarbeitung:** [sharp](https://sharp.pixelplumbing.com/) (Apple-Touch-Icon-Rendering)
- **Frontend:** Server-gerenderte SPA-Shell + Vanilla JS Client-Router, kein Build-Step
- **Design:** Nocturne Design System (dark, Design-Tokens) mit Gold-Accent (`#c9a44e` / `#e2c479`) auf Ground `#161826`, Inter-Font, Phosphor-Icons
- **Deployment:** Railway (NIXPACKS builder, Volume für persistente Daten)

---

## 🏗️ Project Architecture

```
root
├─ src/
│  ├─ server.js      # Express-App: alle API-Routes, SPA-Fallback, druckbares QR-Poster
│  ├─ db.js          # better-sqlite3 Bootstrap; Tables: events, guests, photos, guest_task_done
│  ├─ auth.js        # scrypt-Hashing, HMAC-signierte Cookie-Tokens, randomId()
│  └─ tasks.js       # 207 kuratierte Foto-Aufgaben (TASKS array, taskById/taskCount)
├─ public/
│  ├─ index.html            # SPA-Shell + PWA-Meta-Tags, SW-Registrierung
│  ├─ app.js                # Vanilla-JS SPA mit Client-Router (10 Screens)
│  ├─ styles.css            # Nocturne dark + Gold-Accent, Inter, Phosphor
│  ├─ manifest.webmanifest  # PWA-Manifest (standalone, theme #161826)
│  └─ sw.js                 # Service Worker (App-Shell-Cache fch-shell-v1)
├─ railway.json      # Railway-Deploy-Config (NIXPACKS, npm start)
├─ .env.example      # Dokumentierte Environment-Variablen
└─ package.json      # ESM, engines.node "22.x"
```

**Daten:** Die SQLite-DB und hochgeladene Fotos liegen unter `DATA_DIR` (Default `./data`, Uploads in `DATA_DIR/uploads`). Auf Railway zeigt `DATA_DIR` auf ein gemountetes Volume (`/data`), damit Daten Deployments überleben.

**Screens (SPA):** `start`, `join`, `task`, `capture`, `success`, `gallery`, `detail`, `hostCreate`, `hostQr`, `hostLive`.

### 🔌 API-Routen

| Methode & Pfad | Auth | Zweck |
| --- | --- | --- |
| `GET /api/health` | – | Health-Check → `{ ok: true }` |
| `POST /api/host/events` | – | Event erstellen, liefert `hostToken` |
| `POST /api/host/events/:id/auth` | Token | Host-Token gegen signiertes Host-Cookie tauschen |
| `GET /api/host/events/:id/stats` | Host | Event-Statistiken |
| `GET /api/host/events/:id/qr.svg` | – | QR-Code als SVG |
| `GET /api/events/:id/info` | – | Öffentliche Event-Infos (Name, ob Passwort nötig) |
| `POST /api/events/:id/join` | – | Als Gast beitreten (Name + Passwort) → Gast-Cookie |
| `GET /api/events/:id/me` | Gast | Aktuelle Aufgabe des Gasts |
| `POST /api/events/:id/task/rotate` | Gast | Neue Aufgabe ziehen |
| `POST /api/events/:id/photos` | Gast | Foto hochladen |
| `GET /api/events/:id/gallery` | Gast/Host | Galerie-Liste |
| `GET /api/events/:id/photos/:photoId/image` | Gast/Host | Foto inline ausliefern (kein Download) |
| `GET /host/:id/print?t=<token>` | Token | Druckbares QR-Poster |

---

## 🔐 Auth-Modell

- **Gastgeber:** Beim Event-Erstellen wird ein zufälliger `hostToken` erzeugt. Das Host-Dashboard unter `/host/:id?t=TOKEN` tauscht den Token gegen ein signiertes Host-Cookie (`fch_<id>`). Der Token wird zusätzlich in `localStorage` gespeichert (`hosttoken_<id>`) für Druck-/Einladungs-Links.
- **Gast:** Beim Beitreten unter `/:id` mit Name + (host-gesetztem) Gast-Passwort wird ein signiertes Gast-Cookie (`fcg_<id>`) gesetzt.
- **Galerie & Bilder** erfordern ein gültiges Gast- oder Host-Cookie → Fremde werden geblockt.
- **Fotos** werden inline ausgeliefert; Download wird best-effort verhindert (CSS `user-select`/`drag: none`, geblocktes Kontextmenü auf geschützten Bildern). Kein echter DRM-Schutz.

---

## 🚀 Getting Started

### 🔧 Prerequisites
- Node.js `22.x` (in `package.json` gepinnt — nicht lockern, sonst schlagen die Prebuilt-Binaries fehl)
- npm

### 📦 Installation & Setup
```bash
# Clone
git clone https://github.com/konradthiemann/Foto-Challenge.git
cd Foto-Challenge

# Dependencies installieren
npm install

# Environment vorbereiten
cp .env.example .env
# SESSION_SECRET auf einen langen Zufallswert setzen:
#   openssl rand -hex 32

# Dev-Server starten (mit --watch)
npm run dev
```

Die App läuft dann auf `http://localhost:3000` (oder dem in `PORT` gesetzten Port).

> **Hinweis:** Lokal ist Port `3000` ggf. belegt — dann `PORT=3210 npm run dev` verwenden.

### 🔑 Environment Variables

Siehe [`.env.example`](.env.example):

| Variable | Default | Zweck |
| --- | --- | --- |
| `PORT` | `3000` | Port des Servers (Railway setzt ihn automatisch) |
| `DATA_DIR` | `./data` | Verzeichnis für SQLite-DB und Foto-Uploads (auf Railway: Volume-Mount, z. B. `/data`) |
| `SESSION_SECRET` | – | **Pflicht in Produktion.** Langer Zufallsstring zum Signieren der Cookies (`openssl rand -hex 32`) |
| `PUBLIC_BASE_URL` | – | Basis-URL für QR-Codes / Einladungs-Links. Leer = aus Request abgeleitet |

### 📜 Scripts
- `npm start` – Produktionsstart (`node src/server.js`)
- `npm run dev` – Dev-Server mit Auto-Reload (`node --watch`)

---

## ☁️ Deployment (Railway)

Die App läuft live auf Railway (NIXPACKS-Builder, deployed via `railway up`).

1. Neuen Railway-Service anlegen und Repo/Verzeichnis verbinden.
2. **Volume** mounten und `DATA_DIR` darauf zeigen lassen:
   ```bash
   railway volume add --mount-path /data --json
   ```
3. Environment-Variablen setzen: `SESSION_SECRET` (Zufallswert), `DATA_DIR=/data`, `NODE_ENV=production`, `PUBLIC_BASE_URL=<deine-domain>`.
4. Deployen. `railway.json` regelt Build (NIXPACKS) und Start (`npm start`).

> **Wichtig:** `engines.node` ist auf `22.x` gepinnt. better-sqlite3 und sharp haben für Node 22 Prebuilt-Binaries — bei neueren Node-Versionen fällt der Build auf einen nativen node-gyp-Compile zurück und schlägt fehl (fehlende Python-Installation). Node-Version **nicht** lockern.

---

## 📄 License

Dieses Projekt steht unter der [MIT License](LICENSE).
