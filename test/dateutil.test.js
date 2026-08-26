import test from 'node:test';
import assert from 'node:assert/strict';
import {
  berlinDateString, berlinMidnightUTC, berlinHour, uploadWindowForEvent, isDayAfterPhase,
} from '../src/dateutil.js';

test('berlinDateString: liefert den Berlin-Kalendertag als YYYY-MM-DD', () => {
  // 2026-01-15T23:30Z ist in Berlin (CET, UTC+1) schon der 16.
  assert.equal(berlinDateString(Date.parse('2026-01-15T23:30:00Z')), '2026-01-16');
  // 2026-07-15T22:30Z ist in Berlin (CEST, UTC+2) schon der 16.
  assert.equal(berlinDateString(Date.parse('2026-07-15T22:30:00Z')), '2026-07-16');
});

test('berlinMidnightUTC: Winterzeit (CET, UTC+1)', () => {
  assert.equal(berlinMidnightUTC('2026-01-15'), Date.parse('2026-01-14T23:00:00Z'));
});

test('berlinMidnightUTC: Sommerzeit (CEST, UTC+2)', () => {
  assert.equal(berlinMidnightUTC('2026-07-15'), Date.parse('2026-07-14T22:00:00Z'));
});

test('berlinHour: Winterzeit (CET, UTC+1) — 22:30Z ist 23 Uhr Berlin', () => {
  assert.equal(berlinHour(Date.parse('2026-01-15T22:30:00Z')), 23);
});

test('berlinHour: Sommerzeit (CEST, UTC+2) — 22:30Z ist 00 Uhr Berlin (Folgetag)', () => {
  assert.equal(berlinHour(Date.parse('2026-07-15T22:30:00Z')), 0);
});

test('berlinHour: Mittag bleibt Mittag unabhängig von der Zeitzone', () => {
  assert.equal(berlinHour(Date.parse('2026-07-15T10:00:00Z')), 12);
});

test('uploadWindowForEvent: Fenster reicht vom Eventtag 00:00 bis Folgetag 23:59:59.999 (Berlin)', () => {
  const ev = { event_date: '2026-07-15', created_at: Date.parse('2026-07-15T10:00:00Z') };
  const { startMs, endMs } = uploadWindowForEvent(ev);
  assert.equal(startMs, Date.parse('2026-07-14T22:00:00Z'));
  // Folgetag (16.7.) endet um 23:59:59.999 Berlin-Zeit = 21:59:59.999Z (CEST, UTC+2).
  assert.equal(endMs, Date.parse('2026-07-16T21:59:59.999Z'));
});

test('uploadWindowForEvent: Fallback auf Berlin-Kalendertag von created_at, wenn event_date fehlt', () => {
  const ev = { event_date: null, created_at: Date.parse('2026-07-15T10:00:00Z') };
  const { startMs } = uploadWindowForEvent(ev);
  assert.equal(startMs, berlinMidnightUTC('2026-07-15'));
});

test('uploadWindowForEvent: Grenzfall genau am Fensteranfang liegt innerhalb', () => {
  const ev = { event_date: '2026-07-15', created_at: Date.parse('2026-07-15T10:00:00Z') };
  const { startMs, endMs } = uploadWindowForEvent(ev);
  assert.ok(startMs <= startMs && startMs <= endMs);
});

test('uploadWindowForEvent: ein Tag nach dem Fensterende liegt außerhalb', () => {
  const ev = { event_date: '2026-07-15', created_at: Date.parse('2026-07-15T10:00:00Z') };
  const { endMs } = uploadWindowForEvent(ev);
  const now = endMs + 1;
  assert.ok(now > endMs);
});

test('isDayAfterPhase: false kurz vor 08:00 Uhr am Folgetag', () => {
  const ev = { event_date: '2026-07-15', created_at: Date.parse('2026-07-15T10:00:00Z') };
  const before = berlinMidnightUTC('2026-07-16') + 8 * 3600 * 1000 - 1;
  const realNow = Date.now;
  Date.now = () => before;
  try {
    assert.equal(isDayAfterPhase(ev), false);
  } finally {
    Date.now = realNow;
  }
});

test('isDayAfterPhase: true genau um 08:00 Uhr am Folgetag und danach', () => {
  const ev = { event_date: '2026-07-15', created_at: Date.parse('2026-07-15T10:00:00Z') };
  const atEight = berlinMidnightUTC('2026-07-16') + 8 * 3600 * 1000;
  const realNow = Date.now;
  Date.now = () => atEight;
  try {
    assert.equal(isDayAfterPhase(ev), true);
  } finally {
    Date.now = realNow;
  }
});

test('isDayAfterPhase: Fallback auf created_at, wenn event_date fehlt', () => {
  const ev = { event_date: null, created_at: Date.parse('2026-07-15T10:00:00Z') };
  const afterEight = berlinMidnightUTC('2026-07-16') + 8 * 3600 * 1000 + 1000;
  const realNow = Date.now;
  Date.now = () => afterEight;
  try {
    assert.equal(isDayAfterPhase(ev), true);
  } finally {
    Date.now = realNow;
  }
});
