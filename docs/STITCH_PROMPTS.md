# Stitch UI-Prompts – az2.0

Prompts fuer Google Stitch um die GUI der beiden Apps zu generieren.
Ausfuehren mit Claude Code auf ccvm: `claude` starten, dann Stitch MCP nutzen.

---

## Design-System (fuer alle Screens)

```
Clean, professional handcraft/construction app.
Color palette:
  - Primary: deep slate blue #1e3a5f
  - Accent: warm orange #f97316 (action buttons, highlights)
  - Success: green #16a34a
  - Warning: amber #f59e0b
  - Danger: red #dc2626
  - Background: off-white #f8fafc
  - Card: white with subtle shadow
Typography: Inter or system-ui, bold headings
Style: Material-inspired, rounded corners (8px), clear hierarchy
Target: Mobile-first for PWA, Desktop-first for Admin
```

---

## PWA Screens

### PWA-01: Login
```
Mobile login screen for a construction time-tracking app called "az2.0".
Dark slate blue header with white logo "az2.0" and tagline "Zeiterfassung".
Clean white card centered on off-white background.
Fields: Email input, Password input with show/hide toggle.
Large orange "Anmelden" button full width.
"Angemeldet bleiben" checkbox below.
Minimal, professional, no decorative elements.
Mobile 390x844px.
```

### PWA-02: Heute (Startscreen)
```
Mobile dashboard for construction worker time tracking.
Top bar: "Montag, 27. Oktober 2025" with week number "KW 44".
Below: greeting "Hallo Michael" in slate blue.
Status card: large colored circle (red=missing, orange=partial, green=complete) 
  with text "Heute noch nicht erfasst" or hours summary.
Baustelle selector: dropdown card showing current site "Elbchaussee 499".
Two large mode buttons side by side:
  - "SuperEasy" (orange, rocket icon)
  - "Standard" (slate, list icon)
Bottom: "Urlaub" and "Krank" text buttons.
Bottom navigation bar with 4 icons: Heute, Kalender, Baustellen, Profil.
Mobile 390x844px.
```

### PWA-03: SuperEasy Eingabe
```
Mobile time entry form - super easy mode for construction workers.
Top: back arrow, "SuperEasy" title, date "Mo, 27.10.2025".
Baustelle shown as chip: "Elbchaussee 499 ×".
Time row: "Von" [07:00] — "Bis" [16:00] in large tap-friendly inputs.
Pause row: toggle switch "Pause abziehen" ON, then "0:30" pill selector (0:30 / 1:00).
Large textarea: "Was hast du gemacht?" with placeholder and autocomplete chips 
  below showing previous suggestions: "Stichbalken zugeschnitten", "Borsalzbehandlung".
Bottom summary bar: "Gesamtstunden: 8,5 h" in bold orange.
Full-width orange "Speichern" button.
Clean, minimal, thumb-friendly.
Mobile 390x844px.
```

### PWA-04: Standard Eingabe
```
Mobile detailed time entry form for construction workers.
Top: back arrow, "Standard" title, date "Di, 28.10.2025".
Time header card: "07:00 – 16:00 | Pause 0:30 | 8,5 h" compact row.
Section "Tätigkeiten" with + button:
  Each entry is a card with: text field (description), hours field, 
  expandable material list (+ Material button, each material: name + quantity + unit).
Section "Zulagen" with + button:
  Each entry: text field + hours.
Sticky bottom: "Summe: 8,5 h" + orange "Speichern" button.
Swipe-to-delete on cards.
Mobile 390x844px.
```

### PWA-05: Kalenderübersicht
```
Mobile calendar view for construction time tracking.
Month/week selector at top.
Week grid showing Mon-Sun.
Each day cell shows:
  - Day number
  - Colored circle indicator: red (missing), orange (partial), green (complete),
    blue (vacation/Urlaub), yellow (sick/Krank), gray (weekend/holiday)
  - Small hours number below circle if entered.
Current week highlighted.
Below grid: week summary "KW 44: 34,0 / 40,0 Stunden".
Tap on day opens entry for that day.
Mobile 390x844px.
```

### PWA-06: Baustellen-Liste
```
Mobile list of assigned construction sites.
Search bar at top.
Each site card: site name bold, client name below, 
  green "Aktiv" badge, orange "Eintrag erstellen" button.
No results state with friendly illustration.
Mobile 390x844px.
```

### PWA-07: Abwesenheit erfassen
```
Mobile absence entry screen.
Title: "Abwesenheit erfassen"
Date range picker: Von [date] Bis [date].
Type selector as large icon cards:
  - Urlaub (sun icon, blue)
  - Krank (thermometer icon, yellow)
  - Sonstiges (dots icon, gray)
Optional note field.
Orange "Speichern" button.
Mobile 390x844px.
```

---

## Admin Screens

### ADMIN-01: Dashboard
```
Desktop admin dashboard for construction company time management.
Left sidebar: slate blue, logo "az2.0 Admin", nav items with icons.
Main area: top bar with date and admin name.
4 KPI cards in a row: "Offene Einträge heute: 3", "Erfasste Stunden KW44: 148h",
  "Aktive Baustellen: 5", "Mitarbeiter aktiv: 6".
Below: table "Mitarbeiter heute" with columns: Name, Status (colored badge), 
  Baustelle, Stunden, Aktion.
Right side: mini calendar widget.
Desktop 1440px wide, professional clean style.
```

### ADMIN-02: Mitarbeiter-Liste
```
Desktop admin page listing employees.
Header: "Mitarbeiter" title + "+ Neuer Mitarbeiter" button (orange).
Search and filter bar.
Table: Avatar | Name | E-Mail | Rolle | Status | Wochensoll | Aktionen.
Status badge: green "Aktiv" or gray "Inaktiv".
Rolle badge: "Admin", "Vorarbeiter", "Mitarbeiter".
Row hover highlight. Edit and deactivate action icons.
Desktop 1440px.
```

### ADMIN-03: Baustellen-Verwaltung
```
Desktop admin page for construction sites management.
Header: "Baustellen" + "+ Neue Baustelle" button.
Filter: Auftraggeber dropdown, Status (Aktiv/Abgeschlossen) toggle.
Card grid (3 columns): each card shows site name, client name, 
  assigned workers as avatars, active status badge, 
  "Zeiteinträge ansehen" link.
Desktop 1440px.
```

### ADMIN-04: Zeiteintraege Tabelle
```
Desktop admin table for time entries overview.
Header: "Zeiteinträge" with date range picker and filters.
Filters: Mitarbeiter dropdown, Baustelle dropdown, Status dropdown.
Table columns: Datum | Mitarbeiter | Baustelle | Stunden | Modus | Status | Aktionen.
Status badges: "Erfasst" (blue), "Freigegeben" (green), "Entwurf" (gray).
Modus badges: "SuperEasy" (orange), "Standard" (slate).
Row expand to see details. Bulk select checkboxes.
"Freigeben" and "Exportieren" bulk action buttons.
Desktop 1440px.
```

### ADMIN-05: Wochenbericht Auswertung
```
Desktop weekly report view matching the paper Stundenbericht format.
Left: filter panel - Mitarbeiter selector, KW picker.
Right: report preview card.
Report card header: "Stundenbericht Nr. 43 | Mitarbeiter: Michael Ludwig | KW 43".
Table: rows for each day (Mo-Sa), columns: Datum | Baustelle/Tätigkeit | Stunden.
Multi-line tätigkeit cell showing all activities for that day.
Bottom row: "Summe Woche: 35".
Export buttons: "PDF" and "DOCX" orange buttons.
Desktop 1440px.
```

### ADMIN-06: Einstellungen
```
Desktop settings page for construction time tracking admin.
Two-column layout.
Left column sections:
  - "Arbeitszeit" card: Wochenstunden-Soll input, Arbeitstage checkboxes Mon-Sat,
    Bundesland selector for Feiertage.
  - "Pausenregelung" card: toggle "Automatisch abziehen", 
    radio buttons 0:30 / 1:00 / Benutzerdefiniert.
Right column sections:
  - "Stundenbericht Export" card: Firmenname input, Logo upload area.
  - "Lernfunktion" card: toggle "Vorschläge aktivieren".
Save button at bottom right.
Desktop 1440px.
```
