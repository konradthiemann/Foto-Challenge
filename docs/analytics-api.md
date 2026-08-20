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
