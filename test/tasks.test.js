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
