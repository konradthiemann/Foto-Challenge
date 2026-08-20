import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { ZipArchive } from 'archiver';

import db, { UPLOAD_DIR } from './db.js';
import { TASKS, taskById } from './tasks.js';
import { priceCents, tierForGuests } from './pricing.js';
import {
  hashPassword, verifyPassword, signToken, verifyToken, randomId,
} from './auth.js';
import { sendEventCreatedEmail } from './mailer.js';
import rateLimit from 'express-rate-limit';
import { processAndStore } from './images.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PORT = process.env.PORT || 3000;

// Data retention: an event and its whole gallery are deleted this many days
// after creation (DSGVO storage limitation + keeps the volume small).
const RETENTION_DAYS = Math.max(1, parseInt(process.env.RETENTION_DAYS, 10) || 30);
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

// Token that unlocks the global admin dashboard (aggregate stats). Optional —
// if unset, the admin API stays locked.
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(express.json());
app.use(cookieParser());

// ── Rate-Limiting ─────────────────────────────────────────────────────────
// Party-Kontext: ~50 Gäste teilen oft dasselbe WLAN (eine öffentliche IP), daher
// IP-Limits nur großzügig gegen Skript-Missbrauch — das Upload-Limit läuft pro
// Gast. trustProxy-Validierung aus, da hinter dem Railway-Proxy (trust proxy = true).
const rlBase = {
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: { error: 'rate_limited' },
};
const joinLimiter = rateLimit({ ...rlBase, windowMs: 5 * 60_000, limit: 100 });
const authLimiter = rateLimit({ ...rlBase, windowMs: 5 * 60_000, limit: 20 });
const uploadLimiter = rateLimit({
  ...rlBase,
  windowMs: 10 * 60_000,
  limit: 80,
  keyGenerator: (req) => req.guest?.id || req.ip,
});

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

// Backfill retention deadlines for events created before retention existed.
{
  const setExpiry = db.prepare('UPDATE events SET expires_at = ? WHERE id = ?');
  for (const row of db.prepare('SELECT id, created_at FROM events WHERE expires_at IS NULL').all()) {
    setExpiry.run(row.created_at + RETENTION_MS, row.id);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Retention cleanup: delete expired events, their photos (cascade) and files.
// ─────────────────────────────────────────────────────────────────────────

function cleanupExpiredEvents() {
  const now = Date.now();
  const expired = db.prepare('SELECT id FROM events WHERE expires_at IS NOT NULL AND expires_at <= ?').all(now);
  if (!expired.length) return 0;

  const filesFor = db.prepare('SELECT filename FROM photos WHERE event_id = ?');
  const delEvent = db.prepare('DELETE FROM events WHERE id = ?');
  for (const { id } of expired) {
    for (const { filename } of filesFor.all(id)) {
      fs.rm(path.join(UPLOAD_DIR, filename), { force: true }, () => {});
    }
    delEvent.run(id); // ON DELETE CASCADE removes guests, photos, task rows
  }
  console.log(`[retention] deleted ${expired.length} expired event(s)`);
  return expired.length;
}

cleanupExpiredEvents();
setInterval(cleanupExpiredEvents, 60 * 60 * 1000).unref(); // hourly

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

// memoryStorage: der Buffer wird in der Route von images.js verkleinert +
// EXIF-bereinigt und dann geschrieben (statt das Rohbild direkt abzulegen).
const upload = multer({
  storage: multer.memoryStorage(),
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
  const guestLimit = Math.max(5, Math.min(200, parseInt(req.body.guestLimit, 10) || 5));
  const password = String(req.body.guestPassword || '');
  const hostPassword = String(req.body.hostPassword || '');
  const hostEmail = String(req.body.hostEmail || '').trim().toLowerCase().slice(0, 120);

  if (!name) return res.status(400).json({ error: 'name_required' });
  if (password.length < 3) return res.status(400).json({ error: 'password_too_short' });
  if (hostPassword.length < 4) return res.status(400).json({ error: 'host_password_too_short' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hostEmail)) {
    return res.status(400).json({ error: 'email_invalid' });
  }

  const id = uniqueEventId(name);
  const hostToken = randomId(16);
  const joinCode = generateJoinCode();
  const createdAt = Date.now();
  const expiresAt = createdAt + RETENTION_MS;
  db.prepare(`
    INSERT INTO events (id, name, guest_limit, guest_password_hash, host_password_hash, host_email, host_token, join_code, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, guestLimit, hashPassword(password), hashPassword(hostPassword), hostEmail, hostToken, joinCode, createdAt, expiresAt);

  res.cookie(hostCookieName(id), signToken({ eventId: id, host: true }), COOKIE_BASE);

  // Fire-and-forget: the info mail must never block or fail event creation.
  sendEventCreatedEmail({
    to: hostEmail,
    eventName: name,
    joinCode: joinCode.toUpperCase(),
    joinUrl: `${baseUrl(req)}/${id}`,
    hostUrl: `${baseUrl(req)}/host/${id}?t=${hostToken}`,
    printUrl: `${baseUrl(req)}/host/${id}/print?t=${hostToken}`,
    expiresAt,
    retentionDays: RETENTION_DAYS,
  }).catch((err) => console.error('[mailer] event-created mail failed:', err.message));

  res.json({
    eventId: id,
    hostToken,
    joinCode: joinCode.toUpperCase(),
    joinUrl: `${baseUrl(req)}/${id}`,
    hostUrl: `${baseUrl(req)}/host/${id}?t=${hostToken}`,
    priceCents: priceCents(guestLimit),
    expiresAt,
    retentionDays: RETENTION_DAYS,
  });
});

// Exchange a host token for a host session cookie (used when opening the host link).
app.post('/api/host/events/:id/auth', authLimiter, (req, res) => {
  const ev = getEvent(req.params.id);
  const token = String(req.body.token || '');
  if (!ev) return res.status(404).json({ error: 'not_found' });
  if (token !== ev.host_token) return res.status(401).json({ error: 'bad_token' });
  res.cookie(hostCookieName(ev.id), signToken({ eventId: ev.id, host: true }), COOKIE_BASE);
  res.json({ ok: true });
});

// Host recovery: log back in with the event code (or slug) + host password.
// Lets the host return on any device even after cookies/localStorage are gone.
app.post('/api/host/login', authLimiter, (req, res) => {
  const ev = getEventByIdOrCode(req.body.code);
  const password = String(req.body.password || '');
  if (!ev) return res.status(404).json({ error: 'not_found' });
  if (!ev.host_password_hash) return res.status(409).json({ error: 'no_host_password' });
  if (!verifyPassword(password, ev.host_password_hash)) {
    return res.status(401).json({ error: 'bad_password' });
  }
  res.cookie(hostCookieName(ev.id), signToken({ eventId: ev.id, host: true }), COOKIE_BASE);
  res.json({ eventId: ev.id });
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
    expiresAt: ev.expires_at,
    retentionDays: RETENTION_DAYS,
    guests: guests.map((g) => ({ id: g.id, name: g.name, joinedAt: g.created_at })),
    recent,
  });
});

// Host can permanently delete their event + all photos.
app.delete('/api/host/events/:id', requireHost, (req, res) => {
  const ev = req.event;
  for (const { filename } of db.prepare('SELECT filename FROM photos WHERE event_id = ?').all(ev.id)) {
    fs.rm(path.join(UPLOAD_DIR, filename), { force: true }, () => {});
  }
  db.prepare('DELETE FROM events WHERE id = ?').run(ev.id); // CASCADE
  console.log(`[delete] host deleted event ${ev.id} (${ev.name})`);
  res.json({ ok: true });
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
// API — admin (global aggregate dashboard, ADMIN_TOKEN protected)
// ─────────────────────────────────────────────────────────────────────────

const ADMIN_COOKIE = 'fca';

function requireAdmin(req, res, next) {
  const data = verifyToken(req.cookies[ADMIN_COOKIE]);
  if (!data || !data.admin) return res.status(401).json({ error: 'not_admin' });
  next();
}

app.post('/api/admin/auth', authLimiter, (req, res) => {
  const token = String(req.body.token || '');
  if (!ADMIN_TOKEN) return res.status(503).json({ error: 'admin_disabled' });
  const a = Buffer.from(token);
  const b = Buffer.from(ADMIN_TOKEN);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'bad_token' });
  }
  res.cookie(ADMIN_COOKIE, signToken({ admin: true }), COOKIE_BASE);
  res.json({ ok: true });
});

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const now = Date.now();
  const events = db.prepare('SELECT id, name, guest_limit, created_at, expires_at FROM events ORDER BY created_at DESC').all();
  const totalGuests = db.prepare('SELECT COUNT(*) c FROM guests').get().c;
  const totalPhotos = db.prepare('SELECT COUNT(*) c FROM photos').get().c;

  let revenueCents = 0;
  const tierCounts = {};
  for (const e of events) {
    revenueCents += priceCents(e.guest_limit);
    const label = tierForGuests(e.guest_limit).upTo;
    tierCounts[label] = (tierCounts[label] || 0) + 1;
  }

  // Per-event counts.
  const gc = db.prepare('SELECT COUNT(*) c FROM guests WHERE event_id = ?');
  const pc = db.prepare('SELECT COUNT(*) c FROM photos WHERE event_id = ?');
  const eventRows = events.map((e) => ({
    id: e.id,
    name: e.name,
    guestLimit: e.guest_limit,
    guestCount: gc.get(e.id).c,
    photoCount: pc.get(e.id).c,
    priceCents: priceCents(e.guest_limit),
    createdAt: e.created_at,
    expiresAt: e.expires_at,
    active: !e.expires_at || e.expires_at > now,
  }));

  // 30-day daily series.
  const DAY = 86400000;
  const days = [];
  const startDay = Math.floor(now / DAY) - 29;
  const evAll = db.prepare('SELECT created_at FROM events').all();
  const guAll = db.prepare('SELECT created_at FROM guests').all();
  const phAll = db.prepare('SELECT created_at FROM photos').all();
  const tally = (rows) => {
    const m = {};
    for (const r of rows) { const d = Math.floor(r.created_at / DAY); m[d] = (m[d] || 0) + 1; }
    return m;
  };
  const evT = tally(evAll); const guT = tally(guAll); const phT = tally(phAll);
  for (let i = 0; i < 30; i++) {
    const d = startDay + i;
    days.push({
      date: new Date(d * DAY).toISOString().slice(0, 10),
      events: evT[d] || 0,
      guests: guT[d] || 0,
      photos: phT[d] || 0,
    });
  }

  res.json({
    totals: {
      events: events.length,
      activeEvents: eventRows.filter((e) => e.active).length,
      guests: totalGuests,
      photos: totalPhotos,
      revenueCents,
    },
    tierCounts,
    days,
    events: eventRows.slice(0, 100),
    retentionDays: RETENTION_DAYS,
  });
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

app.post('/api/events/:id/join', joinLimiter, (req, res) => {
  const ev = getEvent(req.params.id);
  if (!ev) return res.status(404).json({ error: 'not_found' });

  const name = String(req.body.name || '').trim().slice(0, 40);
  const password = String(req.body.password || '');
  const consent = req.body.consent === true || req.body.consent === 'true';
  if (!name) return res.status(400).json({ error: 'name_required' });
  if (!consent) return res.status(400).json({ error: 'consent_required' });

  if (ev.guest_password_hash && !verifyPassword(password, ev.guest_password_hash)) {
    return res.status(401).json({ error: 'bad_password' });
  }

  const now = Date.now();

  // Resume an existing identity: if someone rejoins with the same name (e.g. they
  // cleared cookies or switched devices), continue their guest instead of creating
  // a duplicate, so their photos and progress stay under that name.
  const existing = db.prepare(
    'SELECT * FROM guests WHERE event_id = ? AND name = ? COLLATE NOCASE',
  ).get(ev.id, name);
  if (existing) {
    db.prepare('UPDATE guests SET consented_at = ? WHERE id = ?').run(now, existing.id);
    let taskId = existing.current_task_id;
    if (taskId == null) taskId = assignNextTask(existing.id);
    const doneCount = db.prepare('SELECT COUNT(*) c FROM guest_task_done WHERE guest_id = ?').get(existing.id).c;
    res.cookie(guestCookieName(ev.id), signToken({ eventId: ev.id, guestId: existing.id }), COOKIE_BASE);
    return res.json({
      guest: { id: existing.id, name: existing.name },
      event: { id: ev.id, name: ev.name },
      task: taskById(taskId),
      doneCount,
    });
  }

  if (guestCount(ev.id) >= ev.guest_limit) {
    return res.status(403).json({ error: 'full' });
  }

  const guestId = randomId(10);
  db.prepare('INSERT INTO guests (id, event_id, name, consented_at, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(guestId, ev.id, name, now, now);
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

app.post('/api/events/:id/photos', requireGuest, uploadLimiter, upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file' });
  const taskId = req.guest.current_task_id;
  if (taskId == null) return res.status(400).json({ error: 'no_task' });

  let filename;
  try {
    // Verkleinern + EXIF/GPS entfernen (fail-safe: speichert im Fehlerfall das Original).
    ({ filename } = await processAndStore(req.file.buffer, req.file.mimetype, UPLOAD_DIR));
  } catch (err) {
    console.error('[upload] Bild konnte nicht gespeichert werden:', err.message);
    return res.status(500).json({ error: 'upload_failed' });
  }

  const photoId = randomId(10);
  db.prepare(`
    INSERT INTO photos (id, event_id, guest_id, task_id, filename, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(photoId, req.params.id, req.guest.id, taskId, filename, Date.now());
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

// Serve an image only to a joined guest or the host. Inline by default; with
// ?dl=1 as an attachment so participants can save it.
app.get('/api/events/:id/photos/:photoId/image', requireGuestOrHost, (req, res) => {
  const photo = db.prepare('SELECT * FROM photos WHERE id = ? AND event_id = ?')
    .get(req.params.photoId, req.params.id);
  if (!photo) return res.status(404).end();
  const file = path.join(UPLOAD_DIR, photo.filename);
  if (!fs.existsSync(file)) return res.status(404).end();
  res.set('Cache-Control', 'private, max-age=3600');
  res.set('X-Content-Type-Options', 'nosniff');
  if (req.query.dl) {
    res.set('Content-Disposition', `attachment; filename="foto-${photo.id}${path.extname(photo.filename)}"`);
  } else {
    res.set('Content-Disposition', 'inline');
  }
  res.sendFile(file);
});

// Download the whole gallery as a ZIP (guests and host allowed).
app.get('/api/events/:id/download.zip', requireGuestOrHost, (req, res) => {
  const ev = getEvent(req.params.id);
  if (!ev) return res.status(404).end();
  const photos = db.prepare(`
    SELECT p.id, p.task_id, p.filename, g.name AS guest_name
    FROM photos p JOIN guests g ON g.id = p.guest_id
    WHERE p.event_id = ? ORDER BY p.created_at ASC
  `).all(ev.id);
  if (!photos.length) return res.status(404).json({ error: 'empty' });

  const safe = slugify(ev.name) || 'galerie';
  res.set('Content-Type', 'application/zip');
  res.set('Content-Disposition', `attachment; filename="${safe}-galerie.zip"`);

  const zip = new ZipArchive({ zlib: { level: 6 } });
  zip.on('error', (err) => { console.error(err); res.destroy(); });
  zip.pipe(res);
  let n = 0;
  for (const p of photos) {
    const file = path.join(UPLOAD_DIR, p.filename);
    if (!fs.existsSync(file)) continue;
    n += 1;
    const cat = (taskById(p.task_id)?.cat || 'foto').replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase();
    const guest = String(p.guest_name || '').replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase();
    zip.file(file, { name: `${String(n).padStart(3, '0')}_${cat}_${guest}${path.extname(p.filename)}` });
  }
  zip.finalize();
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
    <div class="kicker">Knips</div>
    <h1>${esc(ev.name)}</h1>
    <p class="lead">Scannen, Namen eingeben, mitspielen.</p>
    <div class="qr">${qr}</div>
    <div class="link">${esc(joinUrl.replace(/^https?:\/\//, ''))}</div>
    ${ev.join_code ? `<div class="code">oder Code <b>${esc(ev.join_code.toUpperCase())}</b> eingeben</div>` : ''}
    <ol class="steps">
      <li>QR-Code scannen — mit der Knips-App oder der Handykamera.</li>
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

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'not_found' });
  // Validate single-segment event ids so obvious junk 404s instead of loading the app.
  const seg = req.path.split('/').filter(Boolean);
  if (seg.length === 1 && !RESERVED.has(seg[0]) && !ID_RE.test(seg[0])) {
    return res.status(404).send('Nicht gefunden');
  }
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Multer / generic error handler
app.use((err, req, res, _next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'file_too_large' });
  console.error(err);
  res.status(500).json({ error: 'server_error' });
});

app.listen(PORT, () => console.log(`Knips läuft auf Port ${PORT}`));
