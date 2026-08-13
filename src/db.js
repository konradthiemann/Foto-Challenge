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
    host_token          TEXT NOT NULL,
    created_at          INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS guests (
    id              TEXT PRIMARY KEY,
    event_id        TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    current_task_id INTEGER,
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

export default db;
