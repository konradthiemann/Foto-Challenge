import test from 'node:test';
import assert from 'node:assert/strict';
import { TASKS, taskById, taskCount } from '../src/tasks.js';

test('taskCount entspricht der Array-Länge', () => {
  assert.equal(taskCount(), TASKS.length);
  assert.ok(TASKS.length > 0);
});

test('taskById liefert id + cat + text für gültige ids', () => {
  const t = taskById(0);
  assert.equal(t.id, 0);
  assert.equal(typeof t.cat, 'string');
  assert.equal(typeof t.text, 'string');
});

test('taskById liefert null für ungültige ids', () => {
  assert.equal(taskById(-1), null);
  assert.equal(taskById(TASKS.length), null);
  assert.equal(taskById(9999), null);
});

test('jede Aufgabe hat nicht-leere cat und text', () => {
  for (const t of TASKS) {
    assert.ok(t.cat && t.cat.length > 0);
    assert.ok(t.text && t.text.length > 0);
  }
});

// Phasen-Pool: server.js#assignNextTask filtert per
// `(TASKS[i].phase === 'day-after') === wantDayAfter`. Da server.js wegen
// app.listen() nicht importierbar ist, prüfen wir hier direkt, dass TASKS
// diesen Filter sauber in zwei disjunkte, nicht-leere Pools aufteilt.
test('genau 12 "Der Morgen danach"-Aufgaben mit phase: day-after', () => {
  const dayAfter = TASKS.filter((t) => t.phase === 'day-after');
  assert.equal(dayAfter.length, 12);
  for (const t of dayAfter) assert.equal(t.cat, 'Der Morgen danach');
});

test('Party-Aufgaben (phase !== day-after) bleiben bei 207 und unverändert', () => {
  const party = TASKS.filter((t) => t.phase !== 'day-after');
  assert.equal(party.length, 207);
  // Indizes/Reihenfolge der ursprünglichen 207 Aufgaben bleiben stabil, weil
  // guest_task_done den task_id als Array-Index referenziert.
  assert.equal(taskById(0).cat, 'Der Klassiker');
  assert.equal(taskById(206).cat, 'Der Ort');
});

test('Phasen-Filter vor 08:00 Folgetag: Pool enthält nur Party-Aufgaben', () => {
  const wantDayAfter = false;
  const pool = TASKS.map((_, i) => i).filter((i) => (TASKS[i].phase === 'day-after') === wantDayAfter);
  assert.equal(pool.length, 207);
  assert.ok(pool.every((i) => TASKS[i].phase !== 'day-after'));
});

test('Phasen-Filter ab 08:00 Folgetag: Pool enthält nur "Der Morgen danach"-Aufgaben', () => {
  const wantDayAfter = true;
  const pool = TASKS.map((_, i) => i).filter((i) => (TASKS[i].phase === 'day-after') === wantDayAfter);
  assert.equal(pool.length, 12);
  assert.ok(pool.every((i) => TASKS[i].phase === 'day-after'));
});
