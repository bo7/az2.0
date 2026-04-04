# PWA – Mitarbeiter-Zeiterfassung

## Zweck
Mobile-First Progressive Web App für Dachdecker und Zimmermänner.
Installierbar auf Android/iOS. Offline-fähig.

---

## Screens / Navigation

```
Bottom Navigation:
├── Heute          (Schnellerfassung aktiver Tag)
├── Kalender       (Wochenübersicht + Ampelsystem)
├── Baustellen     (meine zugewiesenen Baustellen)
└── Profil         (Einstellungen, Abmelden)
```

---

## Screen 1: Login
- E-Mail + Passwort (Firebase Auth)
- "Angemeldet bleiben" Checkbox
- Kein Self-Registration (Admin legt Accounts an)

---

## Screen 2: Heute / Schnelleinstieg
- Zeigt aktuellen Tag
- Status-Badge: rot / orange / grün
- Baustellen-Auswahl (Dropdown, nur zugewiesene)
- Modus wählen: SuperEasy | Standard
- Direkt zum Eingabeformular

---

## Screen 3: SuperEasy-Modus

Minimale Eingabe, alles auf einem Bildschirm pro Tag/Baustelle:

```
┌─────────────────────────────────────┐
│  Montag, 27.10.2025                 │
│  Baustelle: Elbchaussee 499         │
│                                     │
│  Von: [07:00]   Bis: [16:00]        │
│                                     │
│  [x] Pause abziehen  Dauer: [0:30]  │
│                                     │
│  Tätigkeit:                         │
│  [Stichbalken zugeschnitten...    ] │
│  (Vorschläge erscheinen beim Tippen)│
│                                     │
│  Gesamtstunden: 8,5 h               │
│                                     │
│  [  Speichern  ]                    │
└─────────────────────────────────────┘
```

Felder:
- Arbeitsbeginn (Uhrzeit)
- Arbeitsende (Uhrzeit)
- Pause abziehen (Toggle aus Einstellungen vorbelegt)
- Pausendauer (0:30 oder 1:00, aus Einstellungen vorbelegt)
- Tätigkeit Freitext (mit KI-Vorschlägen)
- Gesamtstunden (automatisch berechnet, read-only)
- Urlaub / Krank Button als Alternative

---

## Screen 4: Standard-Modus

Detaillierte Erfassung pro Tag:

```
┌─────────────────────────────────────┐
│  Dienstag, 28.10.2025               │
│  Baustelle: Elbchaussee 499         │
│  07:00 – 16:00  Pause: 0:30         │
│                                     │
│  TÄTIGKEITEN                        │
│  + Tätigkeit hinzufügen             │
│  ┌──────────────────────────────┐   │
│  │ Beschreibung: [____________] │   │
│  │ Dauer: [6,0 h]               │   │
│  │ Material:                    │   │
│  │  + Material hinzufügen       │   │
│  │  [Stichbalken 20/24] [1 Stk] │   │
│  └──────────────────────────────┘   │
│                                     │
│  ZULAGEN                            │
│  + Zulage hinzufügen                │
│  ┌──────────────────────────────┐   │
│  │ Beschreibung: [____________] │   │
│  │ Dauer: [1,5 h]               │   │
│  └──────────────────────────────┘   │
│                                     │
│  Summe Tätigkeiten:  7,5 h          │
│  Summe Zulagen:      1,0 h          │
│  Gesamtstunden:      8,5 h          │
│                                     │
│  [  Speichern  ]                    │
└─────────────────────────────────────┘
```

Felder pro Tag:
- Arbeitsbeginn / Arbeitsende (Uhrzeit)
- Pause: Toggle + Dauer (0:30 / 1:00 / custom)
- Tätigkeiten (1..n): Beschreibung + Stunden + Material (optional)
- Zulagen (0..n): Beschreibung + Stunden
- Gesamtstunden (auto-berechnet)
- Urlaub / Krank als ganztägige Alternative

---

## Screen 5: Kalenderübersicht

Wochenansicht (aktuelle + vergangene Wochen scrollbar):

```
KW 44 – Oktober 2025
Mo  Di  Mi  Do  Fr  Sa  So
🔴  🟢  🟢  🟢  🟡  ⬜  ⬜
27  28  29  30  31   1   2
```

Ampelsystem pro Tag:
- Rot: kein Eintrag vorhanden (Arbeitstag laut Soll)
- Orange: Eintrag vorhanden, Stunden < Soll
- Grün: Stunden >= Soll (z.B. >= 8h)
- Grau/Leer: Wochenende / Feiertag
- Blau: Urlaub
- Gelb: Krank

Tap auf Tag → direkt zur Eingabe für diesen Tag

Wochensumme wird angezeigt: `Woche: 34,0 / 40,0 h`

---

## Einstellungen (Profil-Screen)

- Pause automatisch abziehen: [Toggle]
- Standard-Pausendauer: [0:30] [1:00]
- Wochenstunden-Soll: [40]
- Bevorzugter Eingabemodus: [SuperEasy] [Standard]
- Benachrichtigungen: [Toggle] (Reminder fehlende Einträge)

---

## KI-Vorschläge / Lernfunktion

Das System lernt aus vergangenen Einträgen:
- Beim Tippen in Tätigkeitsfeld: Autovervollständigung aus eigener History
- Beim Baustellen-Wechsel: häufigste Tätigkeiten dieser Baustelle vorschlagen
- Materialien: häufig verwendete Materialien dieser Baustelle vorschlagen
- Uhrzeit: letzte verwendete Zeiten als Default vorbelegen

Implementierung: Firestore-Query auf eigene letzte 90 Tage, client-seitig gefiltert.
