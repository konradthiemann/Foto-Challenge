# Spec: Gewichtete Task-Auswahl (Stufe 2)

> **Status: zurückgestellt/geparkt.** Bewusste Folge-Entscheidung aus
> `specs/task-performance-analytics.md` (dort AC7) — wird erst umgesetzt,
> wenn genug echte Party-Daten aus dem bereits gemergten Dashboard-Feature
> ([Foto-Challenge#19](https://github.com/konradthiemann/Foto-Challenge/pull/19),
> [control-plane#16](https://github.com/konradthiemann/control-plane/pull/16))
> vorliegen. Diese Spec dient dazu, das Vorhaben nicht zu vergessen — sie ist
> noch nicht zur Umsetzung freigegeben.

## Problem/Ziel

Seit `task-performance-analytics` weiß Konrad im control-plane, welche der 219
Foto-Aufgaben gut ankommen (hohe `playRate`) und welche häufig übersprungen
werden oder Gäste zum Aufhören bringen (`abandonRate`) — aber `assignNextTask`
(`src/server.js`, über `eligibleTaskIds` in `src/tasks.js`) wählt weiterhin
**rein gleichverteilt zufällig** aus dem eligible Pool. Ziel dieser Folge-Spec:
Aufgaben, die bei Gästen gut ankommen, werden häufiger ausgespielt, schwache
seltener — ohne sie komplett auszuschließen, damit weiterhin genug neue Daten
über sie entstehen (sonst verhungert die Statistik sich selbst: eine Aufgabe,
die nie mehr gezogen wird, sammelt auch nie mehr Exposures). Übergeordnetes
Ziel bleibt wie im Ursprungsfeature: mehr Spaß, mehr wahrgenommener Value für
die Gäste.

## User Stories

- Als Party-Gast möchte ich häufiger als heute Aufgaben bekommen, die andere
  Gäste gerne spielen, statt zufällig auch häufig unbeliebte zu bekommen.
- Als Konrad möchte ich, dass unbeliebte Aufgaben nicht schlagartig
  verschwinden, sondern nur seltener drankommen — vollständiges Ausschließen
  ist weiterhin meine manuelle Entscheidung (`tasks.js` per PR ändern).
- Als Konrad möchte ich die Stärke der Gewichtung über einen einzigen, klar
  auffindbaren Parameter einstellen können (inkl. "aus" = wie heute), nicht
  über verstreute Magic Numbers im Code.

## Akzeptanzkriterien

**AC1 — Gewichtungsformel**
- Given eine Aufgabe mit `exposures >= taskStatsMinExposures` in `task_stats`,
  when der Auswahl-Pool in `eligibleTaskIds`/`assignNextTask` aufgebaut wird,
  then wird sie mit einem Gewicht basierend auf geglätteter `playRate` gezogen
  (gewichtetes Random, **keine** Top-N-/deterministische Auswahl — Exploration
  bleibt erhalten), statt wie heute mit gleichem Gewicht 1.
- Aufgaben unterhalb der Schwelle behalten Gewicht 1 (heutiges Verhalten) —
  neue oder wenig gespielte Aufgaben werden nicht sofort benachteiligt.
- Glättung: Laplace/Bayesian mit einer Konstante `alpha` (Startwert 5, aus
  `task-performance-analytics.md` Offene Frage 5 übernommen) gegen
  Überreaktion bei Stichproben knapp über der Schwelle.

**AC2 — Konfigurierbarkeit**
- Eine einzige exportierte Konstante (z. B. `TASK_WEIGHT_STRENGTH`) steuert,
  wie stark schwache Aufgaben unterdrückt werden. Wert `0` = exakt heutiges
  Verhalten (reine Gleichverteilung) — ein Abschaltknopf ohne Codeänderung an
  mehreren Stellen, falls sich die Gewichtung in der Praxis nicht bewährt.

**AC3 — Bestehende Invarianten bleiben erhalten**
- Phasen-Filter (`phaseOk`/`wantDayAfter`), `avoidId`-Vermeidung und der
  Fallback auf den vollen Pool bleiben unverändert — die Gewichtung wirkt nur
  auf die Ziehung *innerhalb* des bereits gefilterten Pools, ändert also nicht
  *welche* Aufgaben eligible sind, nur *wie wahrscheinlich* jede gezogen wird.

**AC4 — Kein Verhungern**
- Jede in der aktuellen Phase eligible Aufgabe hat immer eine
  Ziehwahrscheinlichkeit > 0, auch die mit der schlechtesten `playRate` — nur
  die relative Häufigkeit sinkt, nie auf 0.

**AC5 — Tests**
- Die Gewichtsberechnung selbst ist deterministisch getestet (Formel direkt
  geprüft, kein Sampling-basierter/flaky Test).
- Zusätzlich ein Verteilungstest über viele simulierte Ziehungen (fester Seed
  bzw. großzügige Toleranz), der die grobe Tendenz bestätigt (beliebte
  Aufgabe häufiger als unbeliebte, aber nicht deterministisch dominant).

**AC6 — Beobachtbarkeit nach Rollout**
- Nach dem Rollout lässt sich in der bereits bestehenden control-plane-
  Ansicht ("Aufgaben-Performance") beobachten, ob sich `playRate`/
  `abandonRate` der zuvor schwächsten Aufgaben über Zeit verändern — kein
  neuer Anzeige-Bedarf, nur ein Beobachtungshinweis für die spätere Abnahme.

## Out of Scope

- Lernende/adaptive Algorithmen (Multi-Armed-Bandit, echtes Reinforcement
  Learning) — bewusst eine einfache, statische Formel, kein Lernsystem (wie
  bereits in `task-performance-analytics.md` festgelegt).
- Automatisches Entfernen/Ersetzen von Aufgabentexten in `tasks.js` — bleibt
  Konrads manuelle, menschlich reviewte Entscheidung.
- Persistente Historie/Zeitverlauf der Gewichte oder Raten — eine
  Momentaufnahme aus `task_stats` reicht für die Gewichtung.
- Rückwirkende Neuzuweisung bereits laufender Guest-Sessions — wirkt nur auf
  künftige `assignNextTask`-Aufrufe.

## Offene Fragen (bei Aufnahme der Umsetzung zu klären)

1. **Fließt `abandonRate` mit ein, oder erstmal nur `playRate`?** Vorschlag:
   v1 nur `playRate` — `abandonRate` trägt laut Ursprungsspec einen
   strukturellen Bias (letzte Aufgabe des Abends), der die Gewichtung sonst
   unnötig verzerren könnte. Erst einbeziehen, wenn die Praxis zeigt, dass der
   Bias nicht relevant stört.
2. **Exakte Formel** (linear vs. potenziert, genauer Bayesian-Smoothing-Wert)
   — reiner Tuning-Parameter, im Plan/bei der Implementierung zu verfeinern,
   keine Architektur-Entscheidung.
3. **Zeitpunkt:** Konrad entscheidet, wann genug echte Party-Daten vorliegen,
   um Wirkung und Verteilung sinnvoll zu verifizieren — reine
   Priorisierungsfrage, kein technischer Blocker.
