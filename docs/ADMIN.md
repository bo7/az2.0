# Admin-WebApp – Büroverwaltung

## Zweck
Desktop-First Webanwendung für das Büro.
Vollzugriff auf alle Daten, Stammdatenpflege, Auswertungen, Export.

---

## Navigation (Sidebar)

```
├── Dashboard          (Übersicht, offene Einträge, Wochenstatistik)
├── Mitarbeiter        (Liste, Anlegen, Bearbeiten, Deaktivieren)
├── Baustellen         (Liste, Anlegen, Bearbeiten, Zuweisung)
├── Auftraggeber       (Liste, Anlegen, Bearbeiten)
├── Zeiteinträge       (Tabelle alle Einträge, Filter, Bearbeiten)
├── Abwesenheiten      (Urlaub/Krank Übersicht)
├── Auswertung         (Wochenberichte, Stundenauswertung)
├── Export             (Stundenbericht PDF/DOCX wie Vorlage)
└── Einstellungen      (Global, Pausenregel, Arbeitsstunden-Soll)
```

---

## Screen: Dashboard

- Kacheln: offene Einträge heute / diese Woche
- Mitarbeiter-Übersicht: wer hat was erfasst (Ampel je Mitarbeiter)
- Schnelllink zu letzten Baustellen
- Wochenkalender-Ansicht (alle Mitarbeiter)

---

## Screen: Mitarbeiter

Liste aller Mitarbeiter:
| Name | E-Mail | Rolle | Status | Aktionen |
|---|---|---|---|---|
| Michael Ludwig | m.ludwig@firma.de | Mitarbeiter | Aktiv | Bearbeiten |

Formular Anlegen/Bearbeiten:
- Name, E-Mail, Rolle (mitarbeiter / vorarbeiter / admin)
- Passwort setzen (Firebase Auth)
- Persönliche Pauseneinstellungen überschreiben (optional)
- Wochenstunden-Soll individuell
- Deaktivieren (kein Login mehr, Daten bleiben erhalten)

---

## Screen: Baustellen

Liste mit Filter (aktiv/inaktiv, Auftraggeber):
- Name der Baustelle (z.B. "Nienstedten, Elbchaussee 499")
- Auftraggeber (verknüpft)
- Zugewiesene Mitarbeiter (Multi-Select)
- Status: aktiv / abgeschlossen

---

## Screen: Auftraggeber

Einfache Liste:
- Firmenname / Privatperson
- Adresse, Telefon, E-Mail
- Verknüpfte Baustellen (Anzahl)

---

## Screen: Zeiteinträge

Tabelle mit Filtern:
- Filter: Mitarbeiter, Baustelle, Zeitraum, Status
- Spalten: Datum | Mitarbeiter | Baustelle | Stunden | Modus | Status
- Inline bearbeiten / Freigeben
- Bulk-Aktionen: Freigeben, Export

---

## Screen: Auswertung

Wochenbericht pro Mitarbeiter (analog zu den Stundenberichten):
- Wähle: Mitarbeiter + Kalenderwoche
- Zeigt: alle Tage der Woche mit Tätigkeiten, Stunden, Summe
- Format entspricht den DOCX/PDF-Vorlagen:
  ```
  Stundenbericht Nr.: 43
  Mitarbeiter: Michael Ludwig
  Datum | Baustelle/Tätigkeit | Stunden
  Mo 20.10. | Krank | -
  Di 21.10. | Spatzenwinkel 07:30 – 17:30 (-1,0) | 8,5
  ...
  Summe Woche: 35
  ```

---

## Screen: Export

- Wähle: Mitarbeiter + KW + Format (PDF / DOCX)
- Export entspricht exakt dem Layout der Stundenberichte
- Sammelexport: mehrere Mitarbeiter / mehrere Wochen
- Download als ZIP

---

## Screen: Einstellungen

Global:
- Wochenstunden-Soll (Standard: 40h)
- Arbeitstage: Mo–Fr (Checkboxen)
- Feiertage: Bundesland auswählen (automatische Übernahme)
- Pause automatisch abziehen: Toggle
- Standard-Pausendauer: 0:30 / 1:00
- Lernvorschläge aktivieren: Toggle

Stundenbericht-Vorlage:
- Firmenname / Logo für Export
- Kopfzeile des Berichts anpassbar
