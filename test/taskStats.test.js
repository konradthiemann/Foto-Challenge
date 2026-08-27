import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// DATA_DIR muss vor dem Import von db.js gesetzt sein → dynamischer Import,
// jede Test-Datei bekommt so ihre eigene, isolierte SQLite-DB.
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'knips-ts-'));
const { recordPlayed, recordSkipped, recordAbandoned } = await import('../src/taskStats.js');
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
