# Datenmodell – Firestore

## Collections

### `mitarbeiter/{uid}`
```json
{
  "uid": "firebase-auth-uid",
  "name": "Michael Ludwig",
  "email": "m.ludwig@firma.de",
  "rolle": "mitarbeiter",
  "aktiv": true,
  "einstellungen": {
    "pauseAbziehen": true,
    "pauseDauer": "00:30",
    "wochenstundenSoll": 40
  },
  "erstelltAm": "timestamp"
}
```
Rollen: `mitarbeiter` | `vorarbeiter` | `admin`

---

### `auftraggeber/{id}`
```json
{
  "id": "auto-id",
  "name": "Privat Müller",
  "anschrift": "Elbchaussee 499, 22609 Hamburg",
  "telefon": "+49 40 ...",
  "email": "",
  "aktiv": true
}
```

---

### `baustellen/{id}`
```json
{
  "id": "auto-id",
  "name": "Nienstedten, Elbchaussee 499",
  "auftraggeberId": "auftraggeber-ref",
  "adresse": "Elbchaussee 499, 22609 Nienstedten",
  "aktiv": true,
  "zugewieseneMitarbeiter": ["uid1", "uid2"],
  "beschreibung": "101 O Dachsanierung",
  "erstelltAm": "timestamp"
}
```

---

### `zeiteintraege/{id}`
```json
{
  "id": "auto-id",
  "mitarbeiterId": "uid",
  "baustelleId": "baustellen-id",
  "datum": "2025-10-27",
  "modus": "standard",
  "arbeitsbeginn": "07:00",
  "arbeitsende": "16:00",
  "pauseDauer": 30,
  "gesamtstunden": 8.5,
  "taetigkeiten": [
    {
      "beschreibung": "Stichbalken 20/24 (O6) zugeschnitten und ausgerichtet",
      "stunden": 6.25,
      "material": [
        { "bezeichnung": "Stichbalken 20/24", "menge": 1, "einheit": "Stk" }
      ]
    }
  ],
  "zulagen": [
    {
      "beschreibung": "Mauerwerk abgetragen und mit Schwammsperrmittel behandelt",
      "stunden": 1.5
    }
  ],
  "status": "erfasst",
  "synchronisiert": true,
  "erstelltAm": "timestamp",
  "geaendertAm": "timestamp"
}
```
Status: `entwurf` | `erfasst` | `freigegeben`

---

### `abwesenheiten/{id}`
```json
{
  "id": "auto-id",
  "mitarbeiterId": "uid",
  "datum": "2025-10-20",
  "art": "krank",
  "ganzerTag": true,
  "stunden": 8,
  "notiz": ""
}
```
Art: `krank` | `urlaub` | `feiertag` | `sonstiges`

---

### `einstellungen/global`
```json
{
  "wochenstundenSoll": 40,
  "arbeitstageProWoche": ["Mo","Di","Mi","Do","Fr"],
  "standardPauseDauer": 30,
  "pauseAutomatischAbziehen": true,
  "lernvorschlaege": true
}
```

---

## Sicherheitsregeln (Firestore Rules)

```
mitarbeiter:   eigene Daten lesen/schreiben, admin alles
baustellen:    zugewiesene Mitarbeiter lesen, admin schreiben
zeiteintraege: eigene erstellen/lesen, admin alles
abwesenheiten: eigene erstellen/lesen, admin alles
auftraggeber:  nur admin
einstellungen: admin schreiben, mitarbeiter lesen
```
