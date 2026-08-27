# Spec: Task-Performance-Analyse (Skip vs. Gespielt vs. Absprung)

> **Entscheidungsstand (2026-08-27):** Alle ursprünglichen Offenen Fragen 1–5
> hat Konrad wie vorgeschlagen bestätigt (siehe „Entscheidungen" unten).
> Zusätzlich gewünscht: eine **Absprungrate pro Aufgabe** — bei welcher
> Aufgabe Gäste die Teilnahme ganz beenden, statt nur weiterzuspielen oder zu
> überspringen (neu: AC4, ersetzt die engere Auslegung der alten Frage 4).

## Problem/Ziel

Konrad weiß heute nur grob (pro **Kategorie**, nicht pro einzelner Aufgabe),
welche Foto-Aufgaben übersprungen (`task_rotate`) vs. gespielt (`photo_upload`)
werden. Um Gästen mehr Spaß und mehr wahrgenommenen Value zu bieten, soll
sichtbar werden, welche der 219 einzelnen Aufgaben in `src/tasks.js` gut
ankommen, welche häufig übersprungen werden — und bei welchen Gäste ganz
aufhören mitzumachen — als Grundlage, um schwache Aufgaben gezielt
auszutauschen und/oder beliebte Aufgaben häufiger auszuspielen. Die
Auswertung soll im `control-plane` sichtbar sein, analog zu den bereits
bestehenden Kategorie-Charts (`uploadsByCategory`/`skipsByCategory`).

Betroffene Repos: **Foto-Challenge** (Task-Pool, Event-Logging,
Auswahl-Logik) und **control-plane** (Anzeige, bestehendes
`KnipsAnalyticsClient`/`DashboardChartFactory`-Muster).

## User Stories

- Als Konrad möchte ich im control-plane pro einzelner Aufgabe sehen, wie oft
  sie gespielt, übersprungen oder zum Absprung-Punkt (Gast macht gar nicht
  mehr weiter) wurde, um schwache Aufgaben gezielt zu identifizieren und in
  `tasks.js` zu ersetzen.
- Als Konrad möchte ich die Aufgaben nach Skip-Quote **und** nach
  Absprungrate sortiert sehen (schlechteste zuerst), statt durch 219
  Einträge scrollen zu müssen.
- Als Konrad möchte ich unterscheiden können, ob eine Aufgabe nur "unbeliebt"
  ist (wird geskippt, Gast macht mit anderer Aufgabe weiter) oder ob sie
  Gäste ganz aus der App vertreibt (Absprung) — das sind unterschiedlich
  ernste Signale.
- Als Party-Gast möchte ich häufiger Aufgaben bekommen, die bei anderen
  Gästen gut ankommen, damit die Challenge mehr Spaß macht statt oft
  übersprungen zu werden oder mich zum Aufhören zu bringen.
- Als Konrad möchte ich, dass die bestehenden Datenschutz-Prinzipien (keine
  Namen, keine Fotos, keine IPs) unangetastet bleiben, auch wenn Task-Statistik
  langlebiger sein soll als ein einzelnes Event.

## Akzeptanzkriterien

**AC1 — Stabile Task-Identität**
- Given `src/tasks.js`, when eine Aufgabe hinzugefügt oder die Reihenfolge
  geändert wird, then bleiben bestehende Zuordnungen (`guest_task_done`,
  Analytics) korrekt derselben Aufgabe zugeordnet.
- Jeder `TASKS`-Eintrag bekommt ein explizites, stabiles `id`-Feld (nicht mehr
  der Array-Index als implizite Identität).
- Beim Einführen bekommt jede bestehende Aufgabe ihre heutige Array-Position
  als `id` zugewiesen (kein Daten-Bruch für laufende Events); neue Aufgaben
  bekommen künftig fortlaufende, nie wiederverwendete `id`s ans Ende. Code,
  der bisher den Index als `task_id` verwendet (`assignNextTask`,
  `guest_task_done`, `taskById`), arbeitet danach mit dieser expliziten `id`.

**AC2 — Per-Task-Event-Logging**
- Given ein Gast überspringt eine Aufgabe (`task_rotate`) oder lädt ein Foto
  hoch (`photo_upload`), when das Event geloggt wird, then enthält `meta`
  zusätzlich zu `cat` die stabile `taskId` der betroffenen Aufgabe.
- Bestehende Konsumenten von `cat` (heutige `uploadsByCategory`/
  `skipsByCategory`) bleiben unverändert funktionsfähig (additive Änderung).

**AC3 — Dauerhafte, datenschutzkonforme Task-Zähler**
- Given `analytics_events` heute per `ON DELETE CASCADE` mit ihrem Event
  gelöscht werden (Retention 30 Tage), when Task-Statistik über viele Partys
  hinweg aussagekräftig sein soll, then existiert eine separate,
  event-unabhängige Zählertabelle `task_stats` (`task_id`, `played_count`,
  `skipped_count`, `abandoned_count` — siehe AC4), die im selben Codepfad wie
  `logEvent` bzw. beim Event-Cleanup (siehe AC4) hochgezählt wird.
- Diese Tabelle enthält ausschließlich Integer-Zähler pro `task_id` — keine
  Namen, keine Fotos, keine IPs, kein Event- oder Personenbezug — und verletzt
  damit nicht das bestehende "wird mit dem Event gelöscht"-Prinzip für
  personenbezogene Daten.

**AC4 — Absprungrate pro Aufgabe (neu)**
- Given ein Gast, dessen aktuell zugewiesene Aufgabe (`guests.current_task_id`)
  beim Ablauf seines Events (`cleanupExpiredEvents`, bevor die Event-/Gast-
  Zeilen gelöscht werden) noch nicht in `guest_task_done` als erledigt
  vermerkt ist, when das Event bereinigt wird, then gilt diese Aufgabe für
  diesen Gast als **Absprungpunkt** und `task_stats.abandoned_count` für
  diese `task_id` wird um 1 erhöht.
- Unterscheidung zu Skip: ein Skip (`task_rotate`) bedeutet, der Gast macht
  mit einer *anderen* Aufgabe weiter — kein Absprung. Ein Absprung bedeutet,
  der Gast reagiert auf seine letzte zugewiesene Aufgabe nie mehr (weder
  Skip noch Upload) bis das Event endet.
- **Bekannte Einschränkung (bewusst akzeptiert, kein Blocker):** Die zuletzt
  zugewiesene Aufgabe eines jeden Gastes trägt einen strukturellen Bias
  ("die Party ist einfach zu Ende", nicht zwingend "die Aufgabe war
  schlecht"). Da die Aufgaben-Zuweisung zufällig (bzw. gewichtet, AC7)
  erfolgt, trifft dieser Effekt über viele Partys hinweg statistisch alle
  Aufgaben etwa gleich stark — er verzerrt also das *relative* Ranking
  zwischen Aufgaben nicht systematisch, erhöht aber die absolute
  Absprungrate aller Aufgaben leicht. Absprungrate ist daher primär als
  **Vergleichswert zwischen Aufgaben** zu lesen, nicht als absolute Quote.
- `playRate`-Berechnung (AC5) bleibt wie bisher auf `played`/`skipped`
  bezogen; `abandonedCount` wird als eigene, dritte Kennzahl ausgewiesen statt
  in `playRate` verrechnet zu werden.

**AC5 — Aggregierte Task-Stats-API**
- Given ein authentifizierter Admin-Request, when
  `GET /api/admin/analytics` aufgerufen wird (oder alternativ ein neuer
  `taskStats`-Zweig darin, siehe Plan-Phase für die konkrete
  Endpoint-Entscheidung), then enthält die Antwort eine `taskStats`-Liste:
  `[{ taskId, cat, text, playedCount, skippedCount, abandonedCount, playRate,
  abandonRate }]`, standardmäßig nach `playRate` aufsteigend sortiert
  (schlechteste zuerst).
- `docs/analytics-api.md` wird um das neue Feld/den neuen Vertrag ergänzt.

**AC6 — Anzeige im control-plane**
- Given das bestehende `KnipsAnalyticsClient`/`DashboardChartFactory`-Muster,
  when die Knips-Seite im control-plane lädt, then zeigt ein neuer Abschnitt
  "Aufgaben-Performance" zwei Ranglisten (oberhalb einer Mindest-
  Stichprobengröße, siehe Offene Frage 5): höchste Skip-Quote und höchste
  Absprungrate — sowie separat die beliebtesten Aufgaben (niedrigste
  Skip-Quote) — je mit Kategorie, gekürztem Text, `playedCount`,
  `skippedCount`, `abandonedCount`, `playRate`, `abandonRate`.
- Skip- und Absprung-Ranglisten sind sichtbar getrennt (unterschiedliche
  Signale, siehe AC4/User-Stories), nicht zu einer Zahl vermischt.
- Aufgaben unterhalb der Mindest-Stichprobengröße werden nicht in die
  Ranglisten aufgenommen (zu wenig Daten, würde nur Rauschen zeigen).

**AC7 — Gewichtete Task-Auswahl (Stufe 2, bewusst spätere Folge-Entscheidung)**
- Nicht Teil dieses Umsetzungsschritts (siehe Entscheidung zu Frage 3 unten) —
  hier nur als Zielbild dokumentiert, damit AC1–3 (stabile Ids, Zähler-Schema)
  so gebaut werden, dass eine spätere Gewichtung ohne erneute Migration
  möglich ist.
- Zielbild: `assignNextTask` gewichtet Aufgaben nach geglätteter `playRate`
  (und ggf. `abandonRate`) statt rein gleichverteilt zu ziehen; Aufgaben
  unterhalb der Mindest-Stichprobengröße behalten Gleichverteilungs-Gewicht;
  bestehende Invarianten (Phasen-Filter, `avoidId`-Vermeidung, Pool-Fallback)
  bleiben erhalten.

**AC8 — Tests**
- Neue/geänderte Logik ist mit `node --test` abgedeckt: Stabilität der
  Task-Id/Migration, Per-Task-Aggregation (Skip/Play/Abandon), Absprung-
  Erkennung beim Event-Cleanup, API-Vertrag/Response-Form.

## Out of Scope

- Automatisches Löschen/Ersetzen von Aufgaben ohne menschliches Review —
  Konrad bleibt für inhaltliche Änderungen an `tasks.js` in der Schleife, kein
  Auto-Editing.
- Ein UI zum Bearbeiten von `tasks.js` direkt im control-plane — dieses
  Feature liefert nur Datengrundlage/Anzeige, keinen Editor. Konrad ändert
  `tasks.js` weiterhin per PR.
- Umbau des Auth-/Account-Systems oder die App-Store-Transformation (separates,
  bewusst zurückgestelltes Vorhaben, siehe `CLAUDE.md`-Roadmap).
- Rückwirkende Analyse bereits vor diesem Feature gelöschter
  (retention-abgelaufener) Events — Task-Stats starten bei 0 ab Deploy dieses
  Features.
- A/B-Testing-Infrastruktur oder lernende Multi-Armed-Bandit-Algorithmen.
- **Tatsächliche Umsetzung der gewichteten Auswahl (AC7)** — bewusst auf einen
  Folge-Schritt verschoben (siehe Entscheidung zu Frage 3), diese Spec liefert
  nur das Dashboard (AC1–6, 8).
- Absprungerkennung *während* ein Event noch läuft (Echtzeit-Timeout,
  "Gast reagiert seit 2 Stunden nicht mehr, Party läuft aber noch") — AC4
  wertet bewusst erst beim endgültigen Event-Ablauf aus, kein
  Zwischen-Polling.

## Entscheidungen (vormals „Offene Fragen", von Konrad am 2026-08-27 bestätigt)

1. **Stabile Task-Identität (AC1):** Bestätigt wie vorgeschlagen — `id` =
   heutige Array-Position beim Einführen, neue Aufgaben bekommen künftig
   fortlaufende, nie wiederverwendete `id`s ans Ende.
2. **Datenlebensdauer (AC3):** Bestätigt wie vorgeschlagen — separate,
   event-unabhängige `task_stats`-Tabelle; bestehende Kaskadierung von
   `analytics_events` mit dem Event bleibt für die event-bezogenen Rohdaten
   unverändert.
3. **Automatische Gewichtung vs. reines Dashboard (AC7):** Bestätigt wie
   vorgeschlagen — gestuft. Dieser Umsetzungsschritt liefert nur das
   Dashboard (AC1–6, 8); die algorithmische Gewichtung (AC7) ist bewusst
   zurückgestellt und wird erst angegangen, wenn die echten Daten aus diesem
   Feature vorliegen.
4. **"Ignoriert/offen"-Zustand:** Ursprünglich vorgeschlagen, komplett zu
   ignorieren — stattdessen jetzt präzisiert und **in Scope** als
   AC4-Absprungrate: statt jedes momentane Zögern während eines laufenden
   Events zu tracken (das bleibt Out of Scope, s. o.), wird nur der
   *endgültige* Zustand beim Event-Ablauf gezählt.
5. **Mindest-Stichprobengröße & Glättung (AC6/AC7):** Bestätigt als
   Startwerte — mindestens 20 Exposures, bevor eine Aufgabe in eine
   Rangliste einfließt; Laplace-Glättung mit α≈5 für die spätere Gewichtung
   (AC7). Reine Tuning-Parameter, bei Bedarf in der Implementierung
   verfeinerbar.
