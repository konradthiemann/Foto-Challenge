import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// DATA_DIR muss vor dem Import von db.js gesetzt sein → dynamischer Import.
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'knips-an-'));
const { logEvent, aggregate, rawEvents, deviceClass } = await import('../src/analytics.js');
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
