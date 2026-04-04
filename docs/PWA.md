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
- Zeigt aktuellen Tag mit allen Einträgen als Karten-Liste
- Mehrere Buchungen pro Tag möglich (Baustellenwechsel)
- Jede Karte: Baustelle + Zeiten + Stunden (tap zum Bearbeiten)
- Tagessumme über alle Baustellen
- "+ Eintrag" Button für weitere Buchung
- Standard-Baustelle ist bei neuen Einträgen vorausgewählt
- Baustellen-Auswahl (Dropdown, nur zugewiesene)
- Modus wählen: SuperEasy | Standard
- Status-Badge: rot (leer) / orange (< Soll) / grün (>= Soll)

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

Tabellarische Erfassung pro Tag. Zeile fuer Zeile: Taetigkeit, dann optional Materialzeilen.
Pause ist eine Taetigkeit mit negativem Vorzeichen.

```
┌───────────────────────────────────────────┐
│  Di, 28.10.2025  Baustelle: Elbchaussee  │
│                                           │
│  VON    BIS    BESCHREIBUNG        STD    │
│  07:00  09:00  Moerteln            2,0 h  │
│    MAT: Moertel          5    Sack        │
│    MAT: Naegel           -    (ohne)      │
│  09:00  09:30  Pause              -0,5 h  │
│  09:30  12:00  Dachdecken          2,5 h  │
│    MAT: Dachziegel      200   Stk         │
│    MAT: Lattung          24   m           │
│  12:00  16:00  Stichbalken zuschn. 4,0 h  │
│    MAT: Stichbalken 20/24  3  Stk         │
│                                           │
│  [+ Taetigkeit]  [+ Material]             │
│                                           │
│  Gesamtstunden:               8,0 h       │
│  [  Speichern  ]                          │
└───────────────────────────────────────────┘
```

Eingabe-Flow:
1. Taetigkeit-Zeile hinzufuegen: Von, Bis, Beschreibung (Chips + Freitext + Mic)
   -> Stunden werden auto-berechnet (Bis - Von)
   -> Speichern der Zeile
2. Optional: Material-Zeilen zur letzten Taetigkeit
   -> Material (Autocomplete + Chips), Einheit, Menge
   -> Bei Einheit "ohne": Mengenfeld ausgeblendet
3. Naechste Taetigkeit oder weitere Materialien

Einheiten: `Stk` | `m` | `m2` | `VE` (Verpackungseinheit) | `ohne` (keine Menge, z.B. Naegel/Schrauben)
Pause: Taetigkeit mit Beschreibung "Pause", negative Stunden (z.B. -0,5)
Gesamtstunden: Summe aller Positionen (inkl. negative Pausen)
Material-Vorschlaege: Top 3 Chips der Baustelle + Autocomplete aus 90-Tage-History

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

## Profil-Screen

- Name + E-Mail (read-only, vom Admin gesetzt)
- Passwort aendern (einzige Admin-Funktion in der PWA)
- Standard-Baustelle: [Auswahl, zugewiesene Baustellen]
- Pause automatisch abziehen: [Toggle]
- Standard-Pausendauer: [0:30] [1:00]
- Bevorzugter Eingabemodus: [SuperEasy] [Standard]
- Spracheingabe: [Toggle] Mikrofon aktivieren
- Abmelden

Hinweis: Alle Admin-Funktionen (Mitarbeiter anlegen, Baustellen verwalten,
Auswertungen, Export) sind in der separaten Admin-WebApp (Desktop).
Beide Apps arbeiten auf der gleichen Firestore-Datenbank.

---

## KI-Vorschlaege / Lernfunktion

Das System lernt aus vergangenen Eintraegen:
- Beim Tippen in Taetigkeitsfeld: Autovervollstaendigung aus eigener History
- Beim Baustellen-Wechsel: haeufigste Taetigkeiten dieser Baustelle vorschlagen
- Materialien: haeufig verwendete Materialien dieser Baustelle vorschlagen
- Uhrzeit: letzte verwendete Zeiten als Default vorbelegen

Implementierung: Firestore-Query auf eigene letzte 90 Tage, client-seitig gefiltert.

---

## Spracheingabe (On-Device STT)

Mikrofon-Button in SuperEasy und Standard-Modus fuer freihändige Eingabe:
- "Heute Elbchaussee, 7 bis 16, Stichbalken zugeschnitten"

### Technologie:
- **Primaer**: Web Speech API (`SpeechRecognition`, `lang: 'de-DE'`)
  - iOS: Apple on-device Spracherkennung (ab iOS 15+)
  - Android: Google on-device Erkennung / Gemini Nano
  - Funktioniert offline auf modernen Geraeten
- **Fallback**: Wenn `SpeechRecognition` nicht verfuegbar -> Button wird ausgeblendet, Standard-Formular-UX
- **Parsing**: Regex-basiert fuer einfache Muster (Zeiten, Baustellenname), spaeter LLM via Cloud Function

### Flow:
1. User tippt Mikrofon-Icon neben Taetigkeits-Feld
2. Pulsierendes Mic-Icon waehrend Aufnahme
3. Transkript wird angezeigt + in Formularfelder geparst
4. User bestaetigt oder korrigiert
5. Wenn STT nicht verfuegbar: Mic-Button unsichtbar, normales Freitext-Feld
