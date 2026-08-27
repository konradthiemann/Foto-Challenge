import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TASKS, taskById, taskCount, eligibleTaskIds,
} from '../src/tasks.js';

test('taskCount entspricht der Array-Länge und ist 219', () => {
  assert.equal(taskCount(), TASKS.length);
  assert.equal(taskCount(), 219);
});

test('jede Aufgabe hat eine ganzzahlige, eindeutige id ≥ 0, gleich dem Array-Index', () => {
  const seen = new Set();
  TASKS.forEach((t, i) => {
    assert.equal(Number.isInteger(t.id), true);
    assert.ok(t.id >= 0);
    assert.equal(t.id, i);
    assert.equal(seen.has(t.id), false);
    seen.add(t.id);
  });
});

test('taskById liefert id + cat + text für gültige ids', () => {
  const t = taskById(0);
  assert.equal(t.id, 0);
  assert.equal(t.cat, 'Der Klassiker');
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

// Phasen-Pool: server.js#assignNextTask nutzt eligibleTaskIds für die
// Phasen-/Done-/Avoid-Filterung. Da server.js wegen app.listen() nicht
// importierbar ist, prüfen wir die reine Funktion hier direkt.
test('genau 12 "Der Morgen danach"-Aufgaben mit phase: day-after', () => {
  const dayAfter = TASKS.filter((t) => t.phase === 'day-after');
  assert.equal(dayAfter.length, 12);
  for (const t of dayAfter) assert.equal(t.cat, 'Der Morgen danach');
});

test('Party-Aufgaben (phase !== day-after) bleiben bei 207 und unverändert', () => {
  const party = TASKS.filter((t) => t.phase !== 'day-after');
  assert.equal(party.length, 207);
  // Indizes/Reihenfolge der ursprünglichen 207 Aufgaben bleiben stabil, weil
  // guest_task_done den task_id als stabile id referenziert.
  assert.equal(taskById(0).cat, 'Der Klassiker');
  assert.equal(taskById(206).cat, 'Der Ort');
});

test('eligibleTaskIds: vor 08:00 Folgetag liefert nur Party-Ids', () => {
  const pool = eligibleTaskIds({ wantDayAfter: false });
  assert.equal(pool.length, 207);
  assert.ok(pool.every((id) => taskById(id).phase !== 'day-after'));
});

test('eligibleTaskIds: ab 08:00 Folgetag liefert nur day-after-Ids', () => {
  const pool = eligibleTaskIds({ wantDayAfter: true });
  assert.equal(pool.length, 12);
  assert.ok(pool.every((id) => taskById(id).phase === 'day-after'));
});

test('eligibleTaskIds schließt doneIds und avoidId innerhalb der Phase aus', () => {
  const doneIds = new Set([0, 1, 2]);
  const pool = eligibleTaskIds({ doneIds, avoidId: 3, wantDayAfter: false });
  assert.ok(!pool.includes(0));
  assert.ok(!pool.includes(1));
  assert.ok(!pool.includes(2));
  assert.ok(!pool.includes(3));
  assert.equal(pool.length, 207 - 4);
});

test('eligibleTaskIds Fallback Stufe 2: alles done -> ignoriert done, behält avoid-Ausschluss', () => {
  // Alle Party-Ids sind "done" -> Stufe 1 (ohne done+avoid) ist leer -> Fallback
  // auf Stufe 2 (nur avoid ausschließen, done ignorieren).
  const partyIds = TASKS.filter((t) => t.phase !== 'day-after').map((t) => t.id);
  const doneIds = new Set(partyIds);
  const pool = eligibleTaskIds({ doneIds, avoidId: 5, wantDayAfter: false });
  assert.equal(pool.length, 206);
  assert.ok(!pool.includes(5));
});

test('eligibleTaskIds Fallback Stufe 2 ohne avoidId: alles done liefert volle Phase', () => {
  // Stufe 3 (weder done noch avoid gefiltert) ist mit den heutigen Pool-Größen
  // (207 bzw. 12 Aufgaben pro Phase) strukturell nicht erreichbar, weil Stufe 2
  // höchstens eine einzige Id (avoidId) entfernt und die Phasen-Pools deutlich
  // größer als 1 sind — bleibt also hier bewusst ungetestet, die Kaskade ist
  // trotzdem implementiert (siehe Plan/AC1: Vorbereitung für künftige, kleinere
  // Task-Pools).
  const partyIds = TASKS.filter((t) => t.phase !== 'day-after').map((t) => t.id);
  const doneIds = new Set(partyIds);
  const pool = eligibleTaskIds({ doneIds, avoidId: null, wantDayAfter: false });
  assert.equal(pool.length, 207);
});
