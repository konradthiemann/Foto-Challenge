import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import QRCode from 'qrcode';
import sharp from 'sharp';

import db, { UPLOAD_DIR } from './db.js';
import { TASKS, taskById } from './tasks.js';
import {
  hashPassword, verifyPassword, signToken, verifyToken, randomId,
} from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PORT = process.env.PORT || 3000;

const app = express();
app.set('trust proxy', true);
app.use(express.json());
app.use(cookieParser());

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

const ID_RE = /^[a-z0-9-]{3,40}$/;
const RESERVED = new Set(['host', 'api', 'assets', 'index.html', 'favicon.ico']);

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 1000 * 60 * 60 * 24 * 60, // 60 days
};

function baseUrl(req) {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`;
}

function slugify(name) {
  return String(name)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
}

function uniqueEventId(name) {
  const base = slugify(name) || 'party';
  const exists = db.prepare('SELECT 1 FROM events WHERE id = ?');
  if (!exists.get(base)) return base;
  for (let i = 0; i < 50; i++) {
    const candidate = `${base}-${randomId(2)}`;
    if (!exists.get(candidate)) return candidate;
  }
  return randomId(6);
}

function getEvent(id) {
  return db.prepare('SELECT * FROM events WHERE id = ?').get(id);
}

// Guests can reach an event either by its slug (/annette-und-bjorn) or by its
// short join code (/ab3k9). Both are stored lowercase.
function getEventByIdOrCode(seg) {
  const s = String(seg || '').trim().toLowerCase();
  if (!s) return null;
  return db.prepare('SELECT * FROM events WHERE id = ? OR join_code = ?').get(s, s);
}

// Short join code: 5 chars, mixed letters+digits, ambiguous characters removed
// (no 0/o, 1/l/i) so it is easy to read off a poster and type. Stored lowercase.
const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

function generateJoinCode() {
  const clash = db.prepare('SELECT 1 FROM events WHERE id = ? OR join_code = ?');
  for (let attempt = 0; attempt < 100; attempt++) {
    const bytes = crypto.randomBytes(5);
    let code = '';
    for (let i = 0; i < 5; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    if (!clash.get(code, code)) return code;
  }
  throw new Error('could not generate a unique join code');
}

// Backfill codes for events created before the feature existed.
{
  const setCode = db.prepare('UPDATE events SET join_code = ? WHERE id = ?');
  for (const row of db.prepare('SELECT id FROM events WHERE join_code IS NULL').all()) {
    setCode.run(generateJoinCode(), row.id);
  }
}

function guestCount(eventId) {
  return db.prepare('SELECT COUNT(*) c FROM guests WHERE event_id = ?').get(eventId).c;
}

function photoCount(eventId) {
  return db.prepare('SELECT COUNT(*) c FROM photos WHERE event_id = ?').get(eventId).c;
}

// Assign a task the guest has not completed yet (avoid the current one when possible).
function assignNextTask(guestId, avoidId = null) {
  const done = new Set(
    db.prepare('SELECT task_id FROM guest_task_done WHERE guest_id = ?')
      .all(guestId).map((r) => r.task_id),
  );
  let pool = TASKS.map((_, i) => i).filter((i) => !done.has(i) && i !== avoidId);
  if (pool.length === 0) pool = TASKS.map((_, i) => i).filter((i) => i !== avoidId);
  if (pool.length === 0) pool = TASKS.map((_, i) => i);
  const taskId = pool[Math.floor(Math.random() * pool.length)];
  db.prepare('UPDATE guests SET current_task_id = ? WHERE id = ?').run(taskId, guestId);
  return taskId;
}

// — Auth middleware —

function guestCookieName(eventId) { return `fcg_${eventId}`; }
function hostCookieName(eventId) { return `fch_${eventId}`; }

function requireGuest(req, res, next) {
  const { id } = req.params;
  const token = req.cookies[guestCookieName(id)];
  const data = verifyToken(token);
  if (!data || data.eventId !== id) {
    return res.status(401).json({ error: 'not_joined' });
  }
  const guest = db.prepare('SELECT * FROM guests WHERE id = ? AND event_id = ?').get(data.guestId, id);
  if (!guest) return res.status(401).json({ error: 'not_joined' });
  req.guest = guest;
  next();
}

// Passes for either a joined guest or the authenticated host of the event.
function requireGuestOrHost(req, res, next) {
  const { id } = req.params;
  const hostData = verifyToken(req.cookies[hostCookieName(id)]);
  if (hostData && hostData.eventId === id && hostData.host) {
    req.isHost = true;
    return next();
  }
  return requireGuest(req, res, next);
}

function requireHost(req, res, next) {
  const { id } = req.params;
  const data = verifyToken(req.cookies[hostCookieName(id)]);
  if (!data || data.eventId !== id || !data.host) {
    return res.status(401).json({ error: 'not_host' });
  }
  const ev = getEvent(id);
  if (!ev) return res.status(404).json({ error: 'not_found' });
  req.event = ev;
  next();
}

// ─────────────────────────────────────────────────────────────────────────
// Uploads
// ─────────────────────────────────────────────────────────────────────────

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/heic': '.heic' }[file.mimetype] || '.jpg';
      cb(null, randomId(12) + ext);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

// ─────────────────────────────────────────────────────────────────────────
// Static assets
// ─────────────────────────────────────────────────────────────────────────

app.use(express.static(PUBLIC_DIR, { index: false, extensions: ['html'] }));

// iOS home-screen icon: Safari ignores SVG apple-touch-icons, so render a PNG
// from the app icon once and cache it in memory.
let appleTouchIconPng = null;
app.get('/apple-touch-icon.png', async (req, res, next) => {
  try {
    if (!appleTouchIconPng) {
      const svg = fs.readFileSync(path.join(PUBLIC_DIR, 'icon.svg'));
      appleTouchIconPng = await sharp(svg)
        .resize(180, 180)
        .flatten({ background: '#161826' })
        .png()
        .toBuffer();
    }
    res.type('image/png').set('Cache-Control', 'public, max-age=604800').send(appleTouchIconPng);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────
// API — health
// ─────────────────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => res.json({ ok: true }));

// ─────────────────────────────────────────────────────────────────────────
// API — host
// ─────────────────────────────────────────────────────────────────────────

app.post('/api/host/events', (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 80);
  const guestLimit = Math.max(1, Math.min(500, parseInt(req.body.guestLimit, 10) || 20));
  const password = String(req.body.guestPassword || '');

  if (!name) return res.status(400).json({ error: 'name_required' });
  if (password.length < 3) return res.status(400).json({ error: 'password_too_short' });

  const id = uniqueEventId(name);
  const hostToken = randomId(16);
  const joinCode = generateJoinCode();
  db.prepare(`
    INSERT INTO events (id, name, guest_limit, guest_password_hash, host_token, join_code, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, guestLimit, hashPassword(password), hostToken, joinCode, Date.now());

  res.cookie(hostCookieName(id), signToken({ eventId: id, host: true }), COOKIE_BASE);

  res.json({
    eventId: id,
    hostToken,
    joinCode: joinCode.toUpperCase(),
    joinUrl: `${baseUrl(req)}/${id}`,
    hostUrl: `${baseUrl(req)}/host/${id}?t=${hostToken}`,
  });
});

// Exchange a host token for a host session cookie (used when opening the host link).
app.post('/api/host/events/:id/auth', (req, res) => {
  const ev = getEvent(req.params.id);
  const token = String(req.body.token || '');
  if (!ev) return res.status(404).json({ error: 'not_found' });
  if (token !== ev.host_token) return res.status(401).json({ error: 'bad_token' });
  res.cookie(hostCookieName(ev.id), signToken({ eventId: ev.id, host: true }), COOKIE_BASE);
  res.json({ ok: true });
});

app.get('/api/host/events/:id/stats', requireHost, (req, res) => {
  const ev = req.event;
  const guests = db.prepare(
    'SELECT id, name, created_at FROM guests WHERE event_id = ? ORDER BY created_at DESC',
  ).all(ev.id);
  const recent = db.prepare(
    'SELECT id, task_id, created_at FROM photos WHERE event_id = ? ORDER BY created_at DESC LIMIT 12',
  ).all(ev.id).map((p) => ({
    id: p.id, createdAt: p.created_at, cat: taskById(p.task_id)?.cat || '',
  }));
  res.json({
    name: ev.name,
    joinCode: (ev.join_code || '').toUpperCase(),
    guestLimit: ev.guest_limit,
    guestCount: guests.length,
    photoCount: photoCount(ev.id),
    createdAt: ev.created_at,
    guests: guests.map((g) => ({ id: g.id, name: g.name, joinedAt: g.created_at })),
    recent,
  });
});

// QR code (SVG) for the public join link. The link is not secret; the gallery
// stays protected by the guest password.
app.get('/api/host/events/:id/qr.svg', async (req, res) => {
  const ev = getEvent(req.params.id);
  if (!ev) return res.status(404).send('not found');
  const svg = await QRCode.toString(`${baseUrl(req)}/${ev.id}`, {
    type: 'svg', margin: 1, errorCorrectionLevel: 'M',
    color: { dark: '#161826', light: '#f3f5fe' },
  });
  res.type('image/svg+xml').set('Cache-Control', 'no-store').send(svg);
});

// ─────────────────────────────────────────────────────────────────────────
// API — events / guests
// ─────────────────────────────────────────────────────────────────────────

app.get('/api/events/:id/info', (req, res) => {
  const ev = getEventByIdOrCode(req.params.id);
  if (!ev) return res.status(404).json({ error: 'not_found' });
  res.json({
    id: ev.id,
    name: ev.name,
    joinCode: (ev.join_code || '').toUpperCase(),
    guestLimit: ev.guest_limit,
    guestCount: guestCount(ev.id),
    requiresPassword: !!ev.guest_password_hash,
    full: guestCount(ev.id) >= ev.guest_limit,
  });
});

app.post('/api/events/:id/join', (req, res) => {
  const ev = getEvent(req.params.id);
  if (!ev) return res.status(404).json({ error: 'not_found' });

  const name = String(req.body.name || '').trim().slice(0, 40);
  const password = String(req.body.password || '');
  if (!name) return res.status(400).json({ error: 'name_required' });

  if (ev.guest_password_hash && !verifyPassword(password, ev.guest_password_hash)) {
    return res.status(401).json({ error: 'bad_password' });
  }
  if (guestCount(ev.id) >= ev.guest_limit) {
    return res.status(403).json({ error: 'full' });
  }

  const guestId = randomId(10);
  db.prepare('INSERT INTO guests (id, event_id, name, created_at) VALUES (?, ?, ?, ?)')
    .run(guestId, ev.id, name, Date.now());
  const taskId = assignNextTask(guestId);

  res.cookie(guestCookieName(ev.id), signToken({ eventId: ev.id, guestId }), COOKIE_BASE);
  res.json({
    guest: { id: guestId, name },
    event: { id: ev.id, name: ev.name },
    task: taskById(taskId),
    doneCount: 0,
  });
});

app.get('/api/events/:id/me', requireGuest, (req, res) => {
  const g = req.guest;
  const doneCount = db.prepare('SELECT COUNT(*) c FROM guest_task_done WHERE guest_id = ?').get(g.id).c;
  let taskId = g.current_task_id;
  if (taskId == null) taskId = assignNextTask(g.id);
  res.json({
    guest: { id: g.id, name: g.name },
    event: { id: req.params.id, name: getEvent(req.params.id)?.name },
    task: taskById(taskId),
    doneCount,
  });
});

app.post('/api/events/:id/task/rotate', requireGuest, (req, res) => {
  const taskId = assignNextTask(req.guest.id, req.guest.current_task_id);
  res.json({ task: taskById(taskId) });
});

app.post('/api/events/:id/photos', requireGuest, upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file' });
  const taskId = req.guest.current_task_id;
  if (taskId == null) return res.status(400).json({ error: 'no_task' });

  const photoId = randomId(10);
  db.prepare(`
    INSERT INTO photos (id, event_id, guest_id, task_id, filename, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(photoId, req.params.id, req.guest.id, taskId, req.file.filename, Date.now());
  db.prepare('INSERT OR IGNORE INTO guest_task_done (guest_id, task_id) VALUES (?, ?)')
    .run(req.guest.id, taskId);

  res.json({ photo: { id: photoId, task: taskById(taskId) } });
});

app.get('/api/events/:id/gallery', requireGuestOrHost, (req, res) => {
  const rows = db.prepare(`
    SELECT p.id, p.task_id, p.created_at, g.name AS guest_name
    FROM photos p JOIN guests g ON g.id = p.guest_id
    WHERE p.event_id = ? ORDER BY p.created_at DESC
  `).all(req.params.id);
  res.json({
    count: rows.length,
    photos: rows.map((p) => {
      const t = taskById(p.task_id);
      return {
        id: p.id, cat: t?.cat || '', text: t?.text || '',
        guestName: p.guest_name, createdAt: p.created_at,
      };
    }),
  });
});

// Serve an image only to a joined guest or the host. Inline, no-download hints.
app.get('/api/events/:id/photos/:photoId/image', requireGuestOrHost, (req, res) => {
  const photo = db.prepare('SELECT * FROM photos WHERE id = ? AND event_id = ?')
    .get(req.params.photoId, req.params.id);
  if (!photo) return res.status(404).end();
  const file = path.join(UPLOAD_DIR, photo.filename);
  if (!fs.existsSync(file)) return res.status(404).end();
  res.set('Cache-Control', 'private, max-age=3600');
  res.set('Content-Disposition', 'inline');
  res.set('X-Content-Type-Options', 'nosniff');
  res.sendFile(file);
});

// ─────────────────────────────────────────────────────────────────────────
// Printable QR poster (server-rendered)
// ─────────────────────────────────────────────────────────────────────────

app.get('/host/:id/print', async (req, res) => {
  const ev = getEvent(req.params.id);
  if (!ev) return res.status(404).send('Event nicht gefunden');
  if (req.query.t !== ev.host_token) return res.status(401).send('Kein Zugriff — Host-Link nötig.');

  const joinUrl = `${baseUrl(req)}/${ev.id}`;
  const qr = await QRCode.toString(joinUrl, {
    type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#161826', light: '#ffffff' },
  });
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  res.type('html').send(`<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(ev.name)} — QR-Code</title>
<style>
  @page { margin: 18mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Inter", system-ui, sans-serif; color: #161826;
         display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .poster { text-align: center; max-width: 520px; padding: 40px; }
  .kicker { letter-spacing: .22em; font-size: 13px; font-weight: 600; color: #b7912f; text-transform: uppercase; }
  h1 { font-size: 40px; font-weight: 500; margin: 14px 0 6px; }
  p.lead { font-size: 17px; color: #444; margin: 0 0 28px; }
  .qr { width: 320px; height: 320px; margin: 0 auto; padding: 18px; border-radius: 20px;
        border: 2px solid #eee; box-shadow: 0 10px 30px rgba(0,0,0,.12); }
  .qr svg { width: 100%; height: 100%; }
  .link { margin-top: 24px; font-size: 20px; font-weight: 600; }
  .code { margin-top: 12px; font-size: 15px; color: #444; }
  .code b { font-size: 26px; letter-spacing: .14em; color: #161826; font-weight: 700; }
  .steps { margin: 26px auto 0; max-width: 380px; text-align: left; font-size: 15px; color: #333; }
  .steps li { margin: 8px 0; }
  .print-btn { margin-top: 30px; padding: 12px 22px; font-size: 15px; border: 1px solid #c9a44e;
               background: #c9a44e; color: #161826; border-radius: 10px; cursor: pointer; }
  @media print { .print-btn { display: none; } }
</style></head>
<body>
  <div class="poster">
    <div class="kicker">Foto-Challenge</div>
    <h1>${esc(ev.name)}</h1>
    <p class="lead">Scannen, Namen eingeben, mitspielen.</p>
    <div class="qr">${qr}</div>
    <div class="link">${esc(joinUrl.replace(/^https?:\/\//, ''))}</div>
    ${ev.join_code ? `<div class="code">oder Code <b>${esc(ev.join_code.toUpperCase())}</b> eingeben</div>` : ''}
    <ol class="steps">
      <li>QR-Code scannen — mit der Foto-Challenge-App oder der Handykamera.</li>
      <li>Namen eingeben${ev.guest_password_hash ? ' und das Party-Passwort eintippen' : ''}.</li>
      <li>Aufgabe bekommen, Foto machen, in die Galerie!</li>
    </ol>
    <button class="print-btn" onclick="window.print()">Drucken</button>
  </div>
</body></html>`);
});

// ─────────────────────────────────────────────────────────────────────────
// SPA fallback
// ─────────────────────────────────────────────────────────────────────────

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'not_found' });
  // Validate single-segment event ids so obvious junk 404s instead of loading the app.
  const seg = req.path.split('/').filter(Boolean);
  if (seg.length === 1 && !RESERVED.has(seg[0]) && !ID_RE.test(seg[0])) {
    return res.status(404).send('Nicht gefunden');
  }
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Multer / generic error handler
app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'file_too_large' });
  console.error(err);
  res.status(500).json({ error: 'server_error' });
});

app.listen(PORT, () => console.log(`Foto-Challenge läuft auf Port ${PORT}`));
