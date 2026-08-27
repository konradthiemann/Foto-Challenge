import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// DATA_DIR muss vor dem Import von db.js gesetzt sein → dynamischer Import,
// jede Test-Datei bekommt so ihre eigene, isolierte SQLite-DB.
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'knips-ts-'));
const {
  recordPlayed, recordSkipped, recordAbandoned, recordAbandonedForEvent,
} = await import('../src/taskStats.js');
const db = (await import('../src/db.js')).default;

function statsFor(taskId) {
  return db.prepare('SELECT * FROM task_stats WHERE task_id = ?').get(taskId);
}

test('recordPlayed zählt hoch, andere Zähler bleiben 0', () => {
  recordPlayed(1);
  recordPlayed(1);
  const row = statsFor(1);
  assert.equal(row.played_count, 2);
  assert.equal(row.skipped_count, 0);
  assert.equal(row.abandoned_count, 0);
});

test('recordSkipped legt die Zeile per Upsert an und zählt hoch', () => {
  recordSkipped(2);
  recordSkipped(2);
  recordSkipped(2);
  const row = statsFor(2);
  assert.equal(row.skipped_count, 3);
  assert.equal(row.played_count, 0);
});

test('recordAbandoned zählt hoch (default count=1)', () => {
  recordAbandoned(3);
  recordAbandoned(3, 2);
  const row = statsFor(3);
  assert.equal(row.abandoned_count, 3);
});

test('recordPlayed/Skipped/Abandoned werfen nie, auch bei ungültiger/null Task-Id', () => {
  assert.doesNotThrow(() => recordPlayed(null));
  assert.doesNotThrow(() => recordSkipped(undefined));
  assert.doesNotThrow(() => recordAbandoned('not-a-number'));
  // nichts wurde für diese "Ids" geschrieben
  assert.equal(statsFor(null), undefined);
});

// — Absprung-Erkennung (recordAbandonedForEvent) —

let eventCounter = 0;
function makeEvent() {
  const id = `ev-${eventCounter++}`;
  db.prepare('INSERT INTO events (id, name, guest_limit, host_token, created_at) VALUES (?,?,?,?,?)')
    .run(id, 'Test-Event', 20, 'tok', Date.now());
  return id;
}

function makeGuest(eventId, currentTaskId) {
  const id = `guest-${Math.random().toString(36).slice(2)}`;
  db.prepare('INSERT INTO guests (id, event_id, name, current_task_id, created_at) VALUES (?,?,?,?,?)')
    .run(id, eventId, id, currentTaskId, Date.now());
  return id;
}

function markDone(guestId, taskId) {
  db.prepare('INSERT OR IGNORE INTO guest_task_done (guest_id, task_id) VALUES (?, ?)').run(guestId, taskId);
}

test('recordAbandonedForEvent zählt nur offene, nicht erledigte current_task_id', () => {
  const eventId = makeEvent();
  const guestA = makeGuest(eventId, 5); // kein guest_task_done-Eintrag -> Absprung
  const guestB = makeGuest(eventId, 7);
  markDone(guestB, 7); // erledigt -> KEIN Absprung
  makeGuest(eventId, null); // kein current_task_id -> zählt nicht

  const before = statsFor(5)?.abandoned_count || 0;
  const count = recordAbandonedForEvent(eventId);
  assert.equal(count, 1);
  assert.equal(statsFor(5).abandoned_count, before + 1);
  assert.equal(statsFor(7), undefined);

  void guestA;
});

test('recordAbandonedForEvent gruppiert mehrere Gäste mit derselben offenen Task-Id', () => {
  const eventId = makeEvent();
  makeGuest(eventId, 9);
  makeGuest(eventId, 9);

  const before = statsFor(9)?.abandoned_count || 0;
  const count = recordAbandonedForEvent(eventId);
  assert.equal(count, 2);
  assert.equal(statsFor(9).abandoned_count, before + 2);
});

test('recordAbandonedForEvent läuft nur einmal sinnvoll: nach dem Löschen der Gäste-Zeilen zählt ein zweiter Aufruf nichts mehr', () => {
  const eventId = makeEvent();
  makeGuest(eventId, 11);

  const first = recordAbandonedForEvent(eventId);
  assert.equal(first, 1);

  db.prepare('DELETE FROM guests WHERE event_id = ?').run(eventId);
  const second = recordAbandonedForEvent(eventId);
  assert.equal(second, 0);
});
