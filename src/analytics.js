import db from './db.js';

// Anonyme, aggregierte Nutzungsstatistik. Grundsätze:
//  - keine Namen, keine Foto-Inhalte, keine IP-Adressen
//  - keine Cookies, kein Tracking über Websites hinweg, keine Profilbildung
//  - best-effort: ein Analytics-Fehler darf NIE einen echten Request stören
//  - mit dem Event gelöscht (FK ON DELETE CASCADE)
//
// Die Auswertung (aggregate/rawEvents) dient dem Admin-Dashboard und dem
// künftigen Symfony-Control-Plane-Backend (Matrizen/Diagramme). rawEvents nutzt
// eine Cursor-Pagination (id > sinceId), damit das Backend inkrementell zieht.

const insert = db.prepare(
  'INSERT INTO analytics_events (event_id, type, meta, created_at) VALUES (?, ?, ?, ?)',
);

/** Loggt ein anonymes Nutzungs-Event. Wirft nie. */
export function logEvent(type, eventId = null, meta = null) {
  try {
    insert.run(eventId, type, meta ? JSON.stringify(meta) : null, Date.now());
  } catch {
    // bewusst verschluckt — Analytics ist optional
  }
}

/** Grobe Geräteklasse aus dem User-Agent (der volle UA wird NICHT gespeichert). */
export function deviceClass(ua = '') {
  const s = String(ua).toLowerCase();
  if (/ipad|tablet/.test(s)) return 'tablet';
  if (/mobile|iphone|android/.test(s)) return 'mobile';
  return 'desktop';
}

/** Aggregierte Auswertung, optional für ein einzelnes Event. */
export function aggregate({ eventId = null } = {}) {
  const where = eventId ? 'event_id = ?' : '1 = 1';
  const p = eventId ? [eventId] : [];
  const rows = (sql) => db.prepare(sql).all(...p);

  const byType = Object.fromEntries(
    rows(`SELECT type, COUNT(*) c FROM analytics_events WHERE ${where} GROUP BY type`)
      .map((r) => [r.type, r.c]),
  );
  const groupMeta = (type, field) => rows(
    `SELECT json_extract(meta, '$.${field}') k, COUNT(*) c
       FROM analytics_events WHERE ${where} AND type = '${type}'
       GROUP BY k ORDER BY c DESC`,
  ).map((r) => ({ [field]: r.k, count: r.c }));

  return {
    byType,
    funnel: {
      appOpen: byType.app_open || 0,
      joinSuccess: byType.join_success || 0,
      photoUpload: byType.photo_upload || 0,
    },
    uploadsByCategory: groupMeta('photo_upload', 'cat'),
    skipsByCategory: groupMeta('task_rotate', 'cat'),
    joinFailReasons: groupMeta('join_fail', 'reason'),
    uploadFailReasons: groupMeta('photo_fail', 'reason'),
    devices: groupMeta('app_open', 'device'),
  };
}

/** Rohe Events ab einem Cursor (id > sinceId), für inkrementelles ETL. */
export function rawEvents({ sinceId = 0, limit = 500 } = {}) {
  const capped = Math.min(Math.max(1, limit), 2000);
  return db.prepare(
    'SELECT id, event_id, type, meta, created_at FROM analytics_events WHERE id > ? ORDER BY id ASC LIMIT ?',
  ).all(sinceId, capped).map((r) => ({
    id: r.id,
    eventId: r.event_id,
    type: r.type,
    meta: r.meta ? JSON.parse(r.meta) : null,
    createdAt: r.created_at,
  }));
}
