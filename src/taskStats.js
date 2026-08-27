import db from './db.js';
import { taskById } from './tasks.js';

// Mindest-Stichprobengröße (Exposures = played+skipped+abandoned), unterhalb
// derer eine Aufgabe in Ranglisten (control-plane, AC6) als zu verrauscht
// gilt. Wird als Top-Level-Feld der aggregate()-Antwort mit ausgeliefert,
// die Filterung selbst passiert beim Konsumenten, nicht hier.
export const TASK_STATS_MIN_EXPOSURES = 20;

// Dauerhafte, event-unabhängige Zähler pro Aufgabe (task_stats-Tabelle in
// db.js). Grundsätze wie in analytics.js: best-effort, wirft nie — ein
// Zähl-Fehler darf nie einen echten Request stören.

const upsert = db.prepare(`
  INSERT INTO task_stats (task_id, played_count, skipped_count, abandoned_count, updated_at)
  VALUES (@taskId, @played, @skipped, @abandoned, @now)
  ON CONFLICT(task_id) DO UPDATE SET
    played_count    = played_count + excluded.played_count,
    skipped_count   = skipped_count + excluded.skipped_count,
    abandoned_count = abandoned_count + excluded.abandoned_count,
    updated_at      = excluded.updated_at
`);

function bump(taskId, { played = 0, skipped = 0, abandoned = 0 } = {}) {
  if (!Number.isInteger(taskId)) return; // ungültige/fehlende Task-Id: nichts schreiben
  try {
    upsert.run({
      taskId, played, skipped, abandoned, now: Date.now(),
    });
  } catch {
    // bewusst verschluckt — Analytics ist optional (gleiches Prinzip wie logEvent)
  }
}

/** Aufgabe wurde per Foto-Upload gespielt. Wirft nie. */
export function recordPlayed(taskId) {
  bump(taskId, { played: 1 });
}

/** Aufgabe wurde übersprungen (task_rotate). Wirft nie. */
export function recordSkipped(taskId) {
  bump(taskId, { skipped: 1 });
}

/** Aufgabe war der Absprungpunkt eines/mehrerer Gäste. Wirft nie. */
export function recordAbandoned(taskId, count = 1) {
  bump(taskId, { abandoned: count });
}

// Absprung-Erkennung beim Event-Ablauf (AC4): jeder Gast, dessen aktuell
// zugewiesene Aufgabe beim Ablauf des Events noch nicht als erledigt
// vermerkt ist, gilt für diese Aufgabe als Absprung. MUSS vor dem Löschen
// der Event-/Gast-Zeilen aufgerufen werden (siehe server.js#cleanupExpiredEvents) —
// danach ist die Information durch ON DELETE CASCADE weg.
// Gibt die Anzahl gezählter Absprünge zurück (0 bei Fehler oder falls es
// keine offenen Aufgaben (mehr) gibt).
export function recordAbandonedForEvent(eventId) {
  try {
    const rows = db.prepare(`
      SELECT g.current_task_id AS task_id, COUNT(*) AS c
      FROM guests g
      WHERE g.event_id = ? AND g.current_task_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM guest_task_done d
                        WHERE d.guest_id = g.id AND d.task_id = g.current_task_id)
      GROUP BY g.current_task_id
    `).all(eventId);

    let total = 0;
    for (const row of rows) {
      recordAbandoned(row.task_id, row.c);
      total += row.c;
    }
    return total;
  } catch {
    return 0;
  }
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

// Aggregierte Per-Task-Performance (AC5): reichert die reinen Zähler mit
// cat/text aus tasks.js an und berechnet playRate/abandonRate. Event-
// unabhängig (task_stats trägt keinen event_id-Bezug). Aufgaben, deren id
// nicht mehr in TASKS existiert (z. B. nach künftiger Kürzung des Arrays),
// werden ausgelassen — die DB-Zeile selbst bleibt unangetastet.
export function taskStatsSummary() {
  const rows = db.prepare(
    'SELECT task_id, played_count, skipped_count, abandoned_count FROM task_stats',
  ).all();

  const summary = [];
  for (const row of rows) {
    const task = taskById(row.task_id);
    if (!task) continue;

    const playedCount = row.played_count;
    const skippedCount = row.skipped_count;
    const abandonedCount = row.abandoned_count;
    const exposures = playedCount + skippedCount + abandonedCount;
    const playDenom = playedCount + skippedCount;

    summary.push({
      taskId: row.task_id,
      cat: task.cat,
      text: task.text,
      playedCount,
      skippedCount,
      abandonedCount,
      exposures,
      playRate: playDenom > 0 ? round4(playedCount / playDenom) : null,
      abandonRate: exposures > 0 ? round4(abandonedCount / exposures) : null,
    });
  }

  // Schlechteste zuerst: playRate aufsteigend, null (keine Daten) ans Ende,
  // Tiebreak exposures absteigend (mehr Daten zuerst), dann taskId aufsteigend
  // (deterministisch, kein Test-/UI-Flackern).
  summary.sort((a, b) => {
    if ((a.playRate === null) !== (b.playRate === null)) {
      return a.playRate === null ? 1 : -1;
    }
    if (a.playRate !== null && a.playRate !== b.playRate) return a.playRate - b.playRate;
    if (a.exposures !== b.exposures) return b.exposures - a.exposures;
    return a.taskId - b.taskId;
  });
  return summary;
}
