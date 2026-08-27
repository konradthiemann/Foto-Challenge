import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// DATA_DIR muss vor dem Import von db.js gesetzt sein → dynamischer Import.
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'knips-an-'));
const { logEvent, aggregate, rawEvents, deviceClass } = await import('../src/analytics.js');
const { recordPlayed, recordSkipped, recordAbandoned } = await import('../src/taskStats.js');
const { taskById } = await import('../src/tasks.js');
const db = (await import('../src/db.js')).default;

// Ein gültiges Event, damit der Foreign-Key greift.
db.prepare('INSERT INTO events (id, name, guest_limit, host_token, created_at) VALUES (?,?,?,?,?)')
  .run('t', 'Test-Event', 20, 'tok', Date.now());

test('deviceClass erkennt grobe Klassen', () => {
  assert.equal(deviceClass('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)'), 'mobile');
  assert.equal(deviceClass('Mozilla/5.0 (iPad; CPU OS 17_0)'), 'tablet');
  assert.equal(deviceClass('Mozilla/5.0 (Macintosh; Intel Mac OS X)'), 'desktop');
});

test('logEvent + aggregate + rawEvents', () => {
  logEvent('app_open', 't', { device: 'mobile' });
  logEvent('join_success', 't');
  logEvent('photo_upload', 't', { cat: 'Der Klassiker', processed: true });
  logEvent('photo_upload', 't', { cat: 'Der Klassiker', processed: true });
  logEvent('task_rotate', 't', { cat: 'Der Zufall' });
  logEvent('join_fail', 't', { reason: 'bad_password' });

  const agg = aggregate({ eventId: 't' });
  assert.equal(agg.byType.app_open, 1);
  assert.equal(agg.byType.photo_upload, 2);
  assert.equal(agg.funnel.photoUpload, 2);
  assert.equal(agg.uploadsByCategory[0].cat, 'Der Klassiker');
  assert.equal(agg.uploadsByCategory[0].count, 2);
  assert.equal(agg.joinFailReasons[0].reason, 'bad_password');
  assert.equal(agg.devices[0].device, 'mobile');

  const raw = rawEvents({ sinceId: 0, limit: 10 });
  assert.ok(raw.length >= 6);
  assert.equal(raw[0].type, 'app_open');
  assert.deepEqual(raw[0].meta, { device: 'mobile' });
});

test('logEvent wirft nie — auch bei ungültigem Event (FK)', () => {
  assert.doesNotThrow(() => logEvent('app_open', 'does-not-exist'));
});

// — aggregate().taskStats (AC5) —

for (let i = 0; i < 1; i += 1) recordPlayed(0); // id 0: 1 played, 9 skipped -> playRate 0.1
for (let i = 0; i < 9; i += 1) recordSkipped(0);
for (let i = 0; i < 9; i += 1) recordPlayed(1); // id 1: 9 played, 1 skipped -> playRate 0.9
recordSkipped(1);
recordAbandoned(2, 5); // id 2: nur abandoned -> playRate null, abandonRate 1
for (let i = 0; i < 5; i += 1) recordPlayed(3); // id 3: playRate 0.5, exposures 10
for (let i = 0; i < 5; i += 1) recordSkipped(3);
recordPlayed(5); // id 5: playRate 0.5, exposures 2 (Tiebreak: weniger exposures als id 3)
recordSkipped(5);
recordPlayed(6); // id 6: playRate 0.5, exposures 2 (Tiebreak: gleiche exposures wie id 5, höhere taskId)
recordSkipped(6);
recordPlayed(7); // id 7: playRate 1/3 (Rundung auf 4 Nachkommastellen)
recordSkipped(7);
recordSkipped(7);
recordPlayed(999999); // Task existiert nicht (mehr) in TASKS -> aus der Response ausgelassen

test('aggregate().taskStats: Form, Berechnung, Sortierung, Rundung', () => {
  const agg = aggregate();
  const byId = Object.fromEntries(agg.taskStats.map((r) => [r.taskId, r]));

  assert.equal(byId[0].cat, taskById(0).cat);
  assert.equal(byId[0].text, taskById(0).text);
  assert.equal(byId[0].playedCount, 1);
  assert.equal(byId[0].skippedCount, 9);
  assert.equal(byId[0].abandonedCount, 0);
  assert.equal(byId[0].exposures, 10);
  assert.equal(byId[0].playRate, 0.1);
  assert.equal(byId[0].abandonRate, 0);

  assert.equal(byId[2].playedCount, 0);
  assert.equal(byId[2].skippedCount, 0);
  assert.equal(byId[2].abandonedCount, 5);
  assert.equal(byId[2].exposures, 5);
  assert.equal(byId[2].playRate, null);
  assert.equal(byId[2].abandonRate, 1);

  assert.equal(byId[7].playRate, 0.3333); // 1/3 gerundet auf 4 Nachkommastellen

  // Task-Id, die nicht mehr in TASKS existiert, taucht nicht auf.
  assert.equal(byId[999999], undefined);

  // Default-Sortierung: playRate aufsteigend, null ans Ende, Tiebreak exposures
  // absteigend, dann taskId aufsteigend.
  const order = agg.taskStats.map((r) => r.taskId);
  assert.deepEqual(order, [0, 7, 3, 5, 6, 1, 2]);
});

test('aggregate().taskStatsMinExposures ist 20', () => {
  assert.equal(aggregate().taskStatsMinExposures, 20);
});

test('aggregate().taskStats ist unabhängig vom event-Filter', () => {
  assert.deepEqual(aggregate({ eventId: 't' }).taskStats, aggregate().taskStats);
});
