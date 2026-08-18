import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'foto.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    guest_limit         INTEGER NOT NULL DEFAULT 20,
    guest_password_hash TEXT,
    host_password_hash  TEXT,
    host_email          TEXT,
    host_token          TEXT NOT NULL,
    join_code           TEXT,
    created_at          INTEGER NOT NULL,
    expires_at          INTEGER
  );

  CREATE TABLE IF NOT EXISTS guests (
    id              TEXT PRIMARY KEY,
    event_id        TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    current_task_id INTEGER,
    consented_at    INTEGER,
    created_at      INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS photos (
    id         TEXT PRIMARY KEY,
    event_id   TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    guest_id   TEXT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    task_id    INTEGER NOT NULL,
    filename   TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS guest_task_done (
    guest_id TEXT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    task_id  INTEGER NOT NULL,
    PRIMARY KEY (guest_id, task_id)
  );

  CREATE INDEX IF NOT EXISTS idx_guests_event ON guests(event_id);
  CREATE INDEX IF NOT EXISTS idx_photos_event ON photos(event_id, created_at DESC);
`);

// Migration: add join_code to events created before short codes existed.
const eventCols = db.prepare('PRAGMA table_info(events)').all();
if (!eventCols.some((c) => c.name === 'join_code')) {
  db.exec('ALTER TABLE events ADD COLUMN join_code TEXT');
}
// Migration: retention timestamp for automatic deletion (added later).
if (!eventCols.some((c) => c.name === 'expires_at')) {
  db.exec('ALTER TABLE events ADD COLUMN expires_at INTEGER');
}
// Migration: host password lets the host log back in on any device.
if (!eventCols.some((c) => c.name === 'host_password_hash')) {
  db.exec('ALTER TABLE events ADD COLUMN host_password_hash TEXT');
}
// Migration: host email for the event-created info mail.
if (!eventCols.some((c) => c.name === 'host_email')) {
  db.exec('ALTER TABLE events ADD COLUMN host_email TEXT');
}
// Migration: consent timestamp on guests (DSGVO accountability).
const guestCols = db.prepare('PRAGMA table_info(guests)').all();
if (!guestCols.some((c) => c.name === 'consented_at')) {
  db.exec('ALTER TABLE guests ADD COLUMN consented_at INTEGER');
}
// NULLs are allowed to repeat in a SQLite unique index, so this is safe before backfill.
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_events_join_code ON events(join_code)');

export default db;
