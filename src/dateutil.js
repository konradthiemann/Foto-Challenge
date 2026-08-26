// Berlin-Zeitzonen-Hilfsfunktionen für den Event-Tag ("Tag der Feier") und
// den Foto-Upload-Zeitraum. Die App bedient ausschließlich deutsche Feiern,
// deshalb ist die Zielzeitzone hart auf Europe/Berlin gesetzt — kein
// npm-Timezone-Package nötig, `Intl` reicht.

const TIMEZONE = 'Europe/Berlin';

// Kalendertag in Europe/Berlin als 'YYYY-MM-DD'. Die en-CA-Locale liefert
// das Format direkt in der gewünschten Reihenfolge.
export function berlinDateString(ms) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms));
}

// UTC-Timestamp (ms) für 00:00 Uhr Berlin-Zeit an einem Kalendertag.
// Pragmatischer Ansatz (kein Timezone-Package): von 00:00 UTC an diesem
// Kalendertag ausgehen, per Intl die tatsächliche Berlin-Stunde an diesem
// UTC-Instant auslesen (= Offset in ganzen Stunden, Europe/Berlin kennt keine
// Halbstunden-Offsets) und davon zurückrechnen.
export function berlinMidnightUTC(dateStr) {
  const guessMs = Date.parse(`${dateStr}T00:00:00Z`);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    hourCycle: 'h23',
    hour: '2-digit',
  }).formatToParts(new Date(guessMs));
  const offsetHours = Number(parts.find((p) => p.type === 'hour').value);
  return guessMs - offsetHours * 3600 * 1000;
}

// Nächster Kalendertag als 'YYYY-MM-DD' (reine Kalenderarithmetik in UTC,
// keine Zeitzonen-Umrechnung nötig, da dateStr schon ein Kalendertag ist).
function nextDateString(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

// Ersatz-Eventtag für Alt-Events ohne gewähltes event_date (vor der Migration):
// der Berlin-Kalendertag ihrer created_at.
function eventDateString(ev) {
  return ev.event_date || berlinDateString(ev.created_at);
}

// Upload-Zeitfenster eines Events: Eventtag + Folgetag, jeweils volle
// Berlin-Kalendertage.
export function uploadWindowForEvent(ev) {
  const dateStr = eventDateString(ev);
  const startMs = berlinMidnightUTC(dateStr);
  const nextMidnight = berlinMidnightUTC(nextDateString(dateStr));
  const endMs = nextMidnight + 24 * 3600 * 1000 - 1;
  return { startMs, endMs };
}

// Stunde (0-23) in Europe/Berlin für einen Zeitstempel — für Tageszeit-
// Auswertungen (z. B. "wann werden die meisten Fotos gemacht"), unabhängig
// vom Kalendertag/-monat, daher separat von berlinDateString/-MidnightUTC.
export function berlinHour(ms) {
  return Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TIMEZONE,
      hourCycle: 'h23',
      hour: '2-digit',
    }).formatToParts(new Date(ms)).find((p) => p.type === 'hour').value,
  );
}

// true ab 08:00 Uhr Berlin-Zeit am Tag NACH dem Event ("Morgen danach"-Phase).
export function isDayAfterPhase(ev) {
  const dateStr = eventDateString(ev);
  const nextMidnight = berlinMidnightUTC(nextDateString(dateStr));
  return Date.now() >= nextMidnight + 8 * 3600 * 1000;
}
