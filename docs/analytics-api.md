# Analytics-API (für das Symfony-Control-Plane-Backend)

Knips erfasst **anonyme, aggregierte** Nutzungs-Events und stellt sie über zwei
ADMIN_TOKEN-geschützte Endpoints bereit. Das künftige Symfony-Backend zieht die
Daten hierüber und baut daraus Matrizen/Diagramme/Auswertungen.

> **Datenschutz:** keine Namen, keine Foto-Inhalte, keine IP-Adressen, keine
> Cookies. Events hängen am Event und werden per Retention (30 Tage,
> `ON DELETE CASCADE`) mit ihm gelöscht.

## Authentifizierung
Erst `POST /api/admin/auth` mit `{ "token": "<ADMIN_TOKEN>" }` → setzt das
`fca`-Session-Cookie. Danach sind die Endpoints erreichbar.

## Event-Typen (`type`)
| type | wann | meta |
|---|---|---|
| `app_open` | Event-Seite geladen (`/api/events/:id/info`) | `{ device: "mobile"\|"tablet"\|"desktop" }` |
| `join_success` | Gast erfolgreich beigetreten | — |
| `join_fail` | Beitritt abgelehnt | `{ reason }` (z. B. `bad_password`, `consent_required`, `full`) |
| `task_rotate` | Aufgabe übersprungen | `{ cat }` (Kategorie der übersprungenen Aufgabe) |
| `photo_upload` | Foto hochgeladen | `{ cat, processed }` (`processed=false` = Original-Fallback) |
| `photo_fail` | Upload fehlgeschlagen | `{ reason }` |
| `photo_delete` | Foto gelöscht | `{ by: "host"\|"guest" }` |
| `gallery_view` | Galerie geöffnet | — |
| `download` | Galerie-ZIP heruntergeladen | — |

## `GET /api/admin/analytics?event=<id?>`
Aggregierte Kennzahlen (optional für ein Event). Antwort:
```jsonc
{
  "byType": { "app_open": 42, "join_success": 30, "photo_upload": 120, ... },
  "funnel": { "appOpen": 42, "joinSuccess": 30, "photoUpload": 120 },
  "uploadsByCategory": [{ "cat": "Der Klassiker", "count": 40 }, ...],
  "skipsByCategory":   [{ "cat": "Der Zufall", "count": 8 }, ...],
  "joinFailReasons":   [{ "reason": "bad_password", "count": 3 }, ...],
  "uploadFailReasons": [{ "reason": "file_too_large", "count": 1 }, ...],
  "devices":           [{ "device": "mobile", "count": 38 }, ...]
}
```

## `GET /api/admin/analytics/raw?since=<id>&limit=<n>`
Rohe Events ab Cursor `id > since` (aufsteigend, `limit` ≤ 2000). Für
inkrementelles ETL: den höchsten gesehenen `id` als nächstes `since` verwenden.
```jsonc
{ "events": [{ "id": 1, "eventId": "party", "type": "app_open",
              "meta": { "device": "mobile" }, "createdAt": 1750000000000 }, ...] }
```

## `GET /api/admin/stats`
Betriebs-/Geschäftskennzahlen (nicht die anonymen Nutzungs-Events oben,
sondern Events/Gäste/Fotos/Umsatz selbst) — dieselbe Auth wie oben. Wird vom
Symfony-Control-Plane-Backend für die Knips-Detailseite konsumiert
(`KnipsAnalyticsClient::fetchStats()`), war aber bislang undokumentiert.
```jsonc
{
  "totals": { "events": 6, "activeEvents": 1, "guests": 37, "photos": 73, "revenueCents": 17158 },
  "tierCounts": { "5": 2, "30": 1, "120": 3 },
  "days": [{ "date": "2026-08-22", "events": 1, "guests": 30, "photos": 61 }, ...],
  "events": [{ "id": "party", "name": "Annette und Björn", "guestLimit": 5,
               "guestCount": 30, "photoCount": 67, "priceCents": 99,
               "createdAt": 1755835200000, "expiresAt": 1758427200000, "active": false }, ...],
  "retentionDays": 30
}
```
`tierCounts` schlüsselt nach `guestLimit`-Obergrenze der Preis-Tier (siehe
`src/pricing.js`), nicht nach tatsächlicher Gästezahl. `days` deckt die
letzten 30 Tage ab (`created_at` von Events/Gästen/Fotos, nicht die
`analytics_events`-Tabelle). `events` ist auf die neuesten 100 begrenzt.

**Wichtig zu `active`:** `expires_at = created_at + RETENTION_DAYS` ist
zugleich der automatische Lösch-Zeitpunkt (stündlicher Cronjob,
`cleanupExpiredEvents` in `src/server.js`) — es gibt **keine** separate
Nachfrist. Ein Event mit `active: false` wird binnen der nächsten Stunde
vollständig gelöscht (DB-Zeile + Fotos + Dateien), nicht erst nach weiteren
30 Tagen.

## `GET /api/admin/storage`
Speicher-Auslastung der hochgeladenen Fotos auf dem Volume (`DATA_DIR/uploads`),
nicht die SQLite-Datenbankdatei selbst.
```jsonc
{ "fileCount": 73, "totalBytes": 214748364 }
```

## `DELETE /api/admin/events/:id`
Löscht ein Event unwiderruflich (DB-Zeile, Gäste, Fotos, Dateien auf dem
Volume) — unabhängig vom Host-Passwort, gleiche Lösch-Logik wie die
Host-Route (`DELETE /api/host/events/:id`) und die automatische
Retention-Bereinigung. `404` wenn das Event nicht existiert, sonst
`{ "ok": true }`.
