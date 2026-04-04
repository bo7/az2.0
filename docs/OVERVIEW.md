# az2.0 – Arbeitszeiterfassung für Dachdecker & Zimmermänner

## Projektübersicht

Zweiteilige Anwendung zur digitalen Stundenerfassung auf Baustellen.
Zielgruppe: Handwerksbetriebe (Dachdecker, Zimmermänner).

---

## Systemarchitektur

```
┌─────────────────────────────────────────────────────────┐
│                    Google Cloud (Firestore)              │
│  - Mitarbeiter    - Baustellen    - Auftraggeber        │
│  - Zeiteinträge   - Einstellungen - Abwesenheiten       │
└────────────────┬──────────────────────────┬─────────────┘
                 │                          │
    ┌────────────▼──────────┐  ┌────────────▼────────────┐
    │   PWA (Mitarbeiter)   │  │  Admin-WebApp (Büro)    │
    │   Mobile-First        │  │  Desktop-First          │
    │   Offline-capable     │  │  Vollzugriff            │
    └───────────────────────┘  └─────────────────────────┘
```

## Zwei unabhängige Apps

### 1. PWA – Mitarbeiter-Zeiterfassung
- Mobile-First, installierbar auf Smartphone
- Login per Mitarbeiter-Account
- Offline-Fähigkeit (lokaler Cache, Sync wenn online)
- Baustellen-Auswahl (nur zugewiesene Baustellen)
- Zwei Eingabemodi: SuperEasy und Standard
- Kalenderübersicht mit Ampelsystem

### 2. Admin-WebApp – Büroverwaltung
- Desktop-First
- Vollzugriff auf alle Daten
- Stammdatenpflege (Mitarbeiter, Baustellen, Auftraggeber)
- Stundenauswertung und Export
- Einstellungen (Pausenregelung, Arbeitsstunden-Soll)
- Stundenbericht-Export (wie die DOCX/PDF-Vorlagen)

---

## Technologie-Stack

| Bereich | Technologie |
|---|---|
| Datenbank | Google Cloud Firestore |
| Auth | Firebase Authentication |
| PWA Frontend | React + Vite + PWA Plugin |
| Admin Frontend | React + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| UI-Design | Google Stitch (via MCP) |
| Hosting | Firebase Hosting |
| Offline | Workbox / Service Worker |

---

## Referenz-Dokumente

Analysierte Stundenberichte:
- `Stundenbericht_43_25.docx` – Michael Ludwig, KW43, Baustellen: Spatzenwinkel, Lesebergweg
- `Stundenbericht_Peter_44_25.pdf` – Peter Ahrens, KW44, Baustellen: Lurup Tannenberg, Nienstedten Elbchaussee 499
