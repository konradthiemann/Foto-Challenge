# Knips — Agent-System Plan

Ziel: Ein MCP-basiertes Agentensystem, das Zahlungen, E-Mails, Buchhaltung,
Feedback und Social Media automatisiert verwaltet — alles über Claude Code
auf dem Mac steuerbar.

---

## Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────┐
│                    Claude Code (Mac)                     │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │  Gmail    │ │  Stripe  │ │  Social  │ │  Apple    │  │
│  │  MCP      │ │  MCP     │ │  Media   │ │  Notes    │  │
│  │  Server   │ │  Server  │ │  MCP     │ │  MCP      │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬──────┘  │
│       │            │            │             │          │
│  ┌────┴─────┐ ┌────┴─────┐ ┌───┴──────┐ ┌───┴───────┐  │
│  │  Google  │ │  Google  │ │ Notion/  │ │  Railway  │  │
│  │  Sheets  │ │  Sheets  │ │ GitHub   │ │  MCP      │  │
│  │  MCP     │ │  (Buchh.)│ │ Issues   │ │  Server   │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 1. Zahlungen & Stripe-Tracking

### MCP Server
- **Stripe MCP** (offiziell): 25+ Tools für Customers, Payments, Invoices, Subscriptions
  - Quelle: [stripe.com/docs/mcp](https://docs.stripe.com)
  - Install: `npx @anthropic-ai/create-mcp --server stripe`
  - Auch verfügbar: [StackOne Stripe MCP](https://www.stackone.com/connectors/stripe/mcp/) (133 Actions)

### Was es kann
- Zahlungsstatus abfragen ("Zeig mir alle Payments von heute")
- Kunden anlegen/suchen
- Refunds auslösen
- Invoices listen und Umsatz abfragen

### Was es NICHT kann (→ eigene Lösung)
- **Webhook-Empfang**: Stripe MCP empfängt keine Webhooks. Die App selbst
  braucht einen `POST /api/stripe/webhook` Endpoint (bereits im Stripe-Plan vorgesehen).
- **Push-Benachrichtigungen bei Kauf**: Webhook → Info-Mail an dich via Resend
  (bereits konfiguriert) ODER Gmail-Label setzen via Google Workspace MCP.

### Flow bei Kauf
```
Gast erstellt Event (>5 Gäste)
  → Stripe Checkout Session
  → Zahlung erfolgt
  → Stripe Webhook → server.js
  → Event freischalten
  → Info-Mail an Host (Resend, existiert bereits)
  → Info-Mail an dich (neue Funktion) ODER Gmail-Label "Knips/Verkäufe"
  → Eintrag in Google Sheet "Knips Umsatz"
```

---

## 2. Gmail & E-Mail-Verwaltung

### MCP Server
- **Google Workspace MCP** (offiziell von Google, seit April 2026)
  - Quelle: [developers.google.com/workspace/gmail/api/guides/configure-mcp-server](https://developers.google.com/workspace/gmail/api/guides/configure-mcp-server)
  - Alternativ: [taylorwilsdon/google_workspace_mcp](https://github.com/taylorwilsdon/google_workspace_mcp) (100+ Tools, Gmail + Drive + Sheets + Calendar)

### Was es kann
- E-Mails durchsuchen, Threads lesen, Labels verwalten
- Drafts erstellen und senden
- E-Mails automatisch labeln (z.B. "Knips/Support", "Knips/Verkäufe")

### Geplante Labels
```
Knips/
  ├── Verkäufe        ← Stripe-Bestätigungen, Kaufbenachrichtigungen
  ├── Support         ← Nutzer-Anfragen, Probleme
  ├── Feedback        ← Rückmeldungen von Hosts/Gästen
  └── System          ← Railway-Alerts, Sentry-Notifications
```

### Workflow
- Claude liest neue E-Mails, kategorisiert sie in Labels
- Erstellt Todos aus Support-Anfragen (→ GitHub Issues oder Apple Notes)
- Antwortet auf Standard-Anfragen mit vorbereiteten Templates

---

## 3. Buchhaltung & Steuer

### MCP Server
- **Google Sheets MCP** (offiziell von Google)
  - Quelle: [developers.google.com/workspace/sheets/api/guides/configure-mcp-server](https://developers.google.com/workspace/sheets/api/guides/configure-mcp-server)
  - Alternativ: [domdomegg/google-sheets-mcp](https://github.com/domdomegg/google-sheets-mcp)

### Warum Google Sheets statt QuickBooks
- Kleinunternehmer § 19 UStG → keine komplexe Buchhaltung nötig
- Kein Vorsteuerabzug, keine USt-Voranmeldung
- Google Sheets reicht für EÜR (Einnahmen-Überschuss-Rechnung)
- Sheets ist kostenlos und per MCP voll steuerbar

### Geplante Sheets
```
Knips Finanzen (Google Spreadsheet)
  ├── Sheet: Einnahmen
  │   Datum | Betrag | Gästepaket | Event-Name | Stripe-ID | Status
  │
  ├── Sheet: Ausgaben
  │   Datum | Betrag | Kategorie | Beschreibung | Beleg
  │   (Railway $5/Mo, Resend, Domain, ...)
  │
  ├── Sheet: EÜR Zusammenfassung
  │   Monat | Einnahmen | Ausgaben | Gewinn
  │
  └── Sheet: Steuerdaten
      Jahr | Gesamteinnahmen | Kleinunternehmergrenze (25.000€) | Status
```

### Workflow
- Stripe Webhook → Server trägt Einnahme automatisch in Sheet ein
- Claude kann auf Anfrage ("Wie viel Umsatz im August?") Sheet abfragen
- Jahresende: Claude erstellt EÜR-Zusammenfassung aus den Daten
- Warnung wenn Kleinunternehmergrenze (25.000€/Jahr) sich nähert

---

## 4. Feedback-Tracking

### Quellen
- E-Mails (Gmail MCP → Label "Knips/Feedback")
- Mündlich/Chat (manuell in Apple Notes oder per Claude eingeben)
- App-intern (geplant: Feedback-Formular nach Event-Ende)

### Ablage
- **Apple Notes** für schnelle Notizen und Ideen
- **GitHub Issues** für konkrete Bugs und Feature Requests

### MCP Server
- **Apple Notes**: [sweetrb/apple-notes-mcp](https://github.com/sweetrb/apple-notes-mcp) oder
  Claude Desktop Connector (built-in, kein Setup nötig)
- **GitHub**: `gh` CLI (bereits konfiguriert) oder GitHub MCP

### Workflow
```
Feedback kommt rein (E-Mail, mündlich, App)
  → Claude kategorisiert: Bug | Feature | Lob | Kritik
  → Bug/Feature → GitHub Issue erstellen (Label: feedback)
  → Lob → Apple Notes "Knips/Testimonials" (Marketing-Material)
  → Kritik → Apple Notes "Knips/Verbesserungen" + ggf. Issue
```

---

## 5. Social Media Tracking

### MCP Server (nach Plattform)

| Plattform | MCP Server | Fokus | Kosten |
|-----------|-----------|-------|--------|
| **X/Twitter** | [crazyrabbitLTC/mcp-twitter-server](https://github.com/crazyrabbitLTC/mcp-twitter-server) | 53 Tools, Analytics, Sentiment | Twitter API v2 (pay-per-use seit Feb 2026) |
| **Instagram** | [Bob-lance/instagram-engagement-mcp](https://github.com/Bob-lance/instagram-engagement-mcp) | Engagement-Tracking, Demographics | Meta Graph API |
| **LinkedIn** | Scraping-basiert oder [Outstand MCP](https://www.outstand.so/mcp) | Posting + Analytics | Ab $0 (Outstand Free) |
| **Multi-Plattform** | [Outstand MCP](https://www.outstand.so/mcp) | 11 Plattformen, 28 Tools | Free Tier verfügbar |

### Geplante Nutzung
- **Posten**: Outstand MCP für Cross-Platform-Posting (ein Post → X + Instagram + LinkedIn)
- **Monitoring**: Plattform-spezifische MCPs für Engagement-Daten
- **Reporting**: Ergebnisse in Google Sheet "Knips Marketing" eintragen

### Tracking-Metriken
```
Knips Marketing (Google Sheet)
  ├── Sheet: Posts
  │   Datum | Plattform | Inhalt | Link | Impressions | Likes | Shares | Kommentare
  │
  ├── Sheet: Mentions
  │   Datum | Plattform | User | Inhalt | Sentiment | Aktion
  │
  └── Sheet: KPIs
      Woche | Follower | Engagement-Rate | Website-Clicks | Conversions
```

### Workflow
```
Wöchentlich (oder per Claude-Anfrage):
  → Social Media MCPs: Engagement-Daten abrufen
  → In Google Sheet "Knips Marketing" eintragen
  → Mentions/Kommentare prüfen
  → Negative Mentions → Todo (GitHub Issue oder Apple Notes)
  → Positive Mentions → "Knips/Testimonials" (Apple Notes)
  → Antwort-Vorschläge für Kommentare generieren
```

---

## 6. Apple Notes & Pages Integration

### MCP Server
- **Apple Notes MCP**: [sweetrb/apple-notes-mcp](https://github.com/sweetrb/apple-notes-mcp)
  - CRUD-Operationen, Suche, Ordner-Management
  - Nur macOS (AppleScript-basiert)
  - Alternativ: Claude Desktop hat built-in Apple Notes Connector

### Apple Pages
- **Kein MCP Server verfügbar** (Stand August 2026)
- Workaround: Pages-Dokumente als Vorlagen manuell pflegen,
  Inhalte über Apple Notes oder Google Docs generieren lassen

### Geplante Notes-Struktur
```
Apple Notes/
  └── Knips/
      ├── Ideen           ← Feature-Ideen, Brainstorming
      ├── Testimonials    ← Positives Feedback, Zitate für Marketing
      ├── Verbesserungen  ← Kritik, UX-Probleme
      ├── Marketing       ← Post-Ideen, Content-Kalender
      └── Live-Tests      ← Notizen von Events, Beobachtungen
```

---

## 7. Todo-Management

### Empfehlung: GitHub Issues (bereits vorhanden)

Warum GitHub Issues statt separatem Tool:
- Repo existiert bereits, `gh` CLI ist konfiguriert
- Labels für Kategorisierung (bug, feature, feedback, marketing, buchhaltung)
- Kostenlos, kein zusätzliches Tool/MCP nötig
- Milestones für Releases (z.B. "v1.1 Payment", "v1.2 Image Optimization")

### Geplante Labels
```
bug              — Fehler
feature          — Neue Funktionalität
feedback         — Nutzer-Feedback
marketing        — Social Media, Content
buchhaltung      — Finanzen, Steuer
infrastructure   — Railway, Deploy, CI
```

### Automatische Issue-Erstellung
Quellen → Claude → GitHub Issue:
- Support-E-Mail mit Bug-Beschreibung → `gh issue create --label bug`
- Feature-Wunsch aus Feedback → `gh issue create --label feature`
- Negative Social-Media-Mention → `gh issue create --label feedback`
- Steuer-Deadline-Erinnerung → `gh issue create --label buchhaltung`

---

## Implementierungs-Reihenfolge

### Phase 1: Grundlagen (vor/nach Live-Test)
- [ ] Apple Notes MCP einrichten (für Feedback-Notizen vom Live-Test)
- [ ] GitHub Issue Labels anlegen
- [ ] Notes-Ordnerstruktur in Apple Notes erstellen

### Phase 2: Payment (wenn Nachfrage validiert)
- [ ] Stripe Account + Integration (→ `memory/stripe-plan.md`)
- [ ] Stripe MCP einrichten
- [ ] Webhook-Endpoint in server.js
- [ ] Kauf-Benachrichtigung an eigene E-Mail

### Phase 3: Finanzen (sobald erste Einnahmen)
- [ ] Google Sheet "Knips Finanzen" anlegen
- [ ] Google Sheets MCP einrichten
- [ ] Google Workspace MCP (Gmail) einrichten
- [ ] Automatischer Eintrag bei Stripe-Webhook
- [ ] Gmail-Labels einrichten

### Phase 4: Marketing (wenn App wächst)
- [ ] Social Media Accounts erstellen (X, Instagram, LinkedIn)
- [ ] Outstand MCP einrichten (Cross-Platform-Posting)
- [ ] Google Sheet "Knips Marketing" anlegen
- [ ] Engagement-Tracking aufsetzen

### Phase 5: Automatisierung (Optimierung)
- [ ] Claude Code Hooks für regelmäßige Tasks (wöchentliches Reporting)
- [ ] E-Mail-Autoresponder-Templates
- [ ] EÜR-Jahresabschluss-Workflow
- [ ] Kleinunternehmergrenze-Warnung
- [ ] Dependabot aktivieren (`.github/dependabot.yml`)
- [ ] Regelmäßiger Dependency-/Tech-Stack-Scan (→ Abschnitt 8)

---

## MCP-Server Übersicht (Installation)

Alle MCP-Server werden in `~/.claude.json` oder Claude Desktop konfiguriert.

```jsonc
// ~/.claude.json (Auszug — Server nach Bedarf aktivieren)
{
  "mcpServers": {
    // Bereits konfiguriert:
    "railway": { /* ... */ },
    "sentry": { /* ... */ },

    // Phase 1:
    "apple-notes": {
      "command": "npx",
      "args": ["-y", "apple-notes-mcp"]
    },

    // Phase 3:
    "google-workspace": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/google-workspace-mcp"],
      "env": {
        "GOOGLE_CLIENT_ID": "...",
        "GOOGLE_CLIENT_SECRET": "...",
        "GOOGLE_REDIRECT_URI": "http://localhost:3000/oauth/callback"
      }
    },
    "google-sheets": {
      "command": "npx",
      "args": ["-y", "google-sheets-mcp"],
      "env": {
        "GOOGLE_CREDENTIALS_PATH": "~/.config/google/credentials.json"
      }
    },

    // Phase 2:
    "stripe": {
      "command": "npx",
      "args": ["-y", "@stripe/mcp"],
      "env": {
        "STRIPE_SECRET_KEY": "sk_live_..."
      }
    },

    // Phase 4:
    "social-media": {
      "command": "npx",
      "args": ["-y", "@outstand/mcp"],
      "env": {
        "OUTSTAND_API_KEY": "..."
      }
    }
  }
}
```

---

## 8. Dependency- & Tech-Stack-Updates

### Ziel
Regelmäßig prüfen ob Dependencies veraltet oder unsicher sind, Node-Runtime
aktuell ist und Railway/Resend-Änderungen beachtet werden — bevor etwas
in Produktion kaputtgeht.

### Was geprüft wird

| Bereich | Prüfung | Wie |
|---------|---------|-----|
| **npm Dependencies** | Veraltete Pakete, Security-Advisories | `npm outdated`, `npm audit` |
| **Node.js Runtime** | Neue LTS-Version, EOL-Status von 22.x | Node.js Release Schedule |
| **Railway Platform** | Nixpacks-Updates, neue Features, Deprecations | Railway Changelog / Docs MCP |
| **Resend API** | API-Änderungen, neue Features | Resend Changelog |
| **Browser-APIs** | PWA/SW-Änderungen, iOS-Safari-Updates | WebKit/Chromium Release Notes |
| **CDN-Dependencies** | Phosphor Icons, jsQR, Chart.js | Versionen in HTML-Dateien |

### Workflow (manuell oder per Claude Code)

```
Claude Code Prompt: "Dependency-Check für Knips"

1. npm outdated --long          → welche Pakete haben Updates?
2. npm audit                    → bekannte Vulnerabilities?
3. node --version vs .nvmrc     → stimmen überein?
4. Railway Docs MCP: Changelog  → Breaking Changes?
5. Check engines.node           → ist 22.x noch LTS?
6. CDN-Versionen in HTML prüfen → gibt es neuere?

Ergebnis: Liste mit
  - Kritisch (Security) → sofort updaten
  - Empfohlen (Features/Performance) → beim nächsten Release
  - Info (nice-to-have) → merken
```

### Automatisierung (optional, Phase 5)

- **GitHub Dependabot**: `.github/dependabot.yml` für automatische PRs bei
  npm-Updates (kostenlos, built-in). Einfachste Lösung.
- **Claude Code Hook**: Regelmäßiger `/loop` mit Dependency-Check-Prompt
  → Ergebnisse in Apple Notes oder GitHub Issue ablegen.

### Dependabot-Config (ready to use)

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
    labels:
      - dependencies
```

### Wichtige Constraints beim Update

- **better-sqlite3**: Braucht Node-Version mit Prebuilt-Binaries. Vor Node-Upgrade
  prüfen ob Prebuilds existieren (sonst Build-Fail auf Railway).
- **multer ^2**: Major-Version-Sprung (v1→v2) bereits gemacht. API ist stabil.
- **archiver ^8**: Pure ESM, named exports only (`{ ZipArchive }`). Kein Default-Export.
- **sharp**: Prebuilds nur für bestimmte Node+OS-Kombis. Testen vor Upgrade.

---

## Kosten-Schätzung (monatlich)

| Dienst | Kosten | Notwendig ab |
|--------|--------|-------------|
| Railway (Hobby) | $5/Mo | Jetzt (läuft bereits) |
| Resend (E-Mail) | Free Tier (100/Tag) | Jetzt (läuft bereits) |
| Google Workspace / Sheets | Kostenlos (privates Konto) | Phase 3 |
| Stripe | 1,4% + 0,25€ pro Transaktion | Phase 2 |
| Outstand (Social MCP) | Free Tier | Phase 4 |
| Twitter API v2 | Pay-per-use | Phase 4 (optional) |
| **Gesamt (Phasen 1-3)** | **~$5/Mo + Stripe-Gebühren** | |
