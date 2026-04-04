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
  "standardBaustelleId": "baustellen-id-oder-null",
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
  "auftraggeberIstBaustelle": false,
  "adresse": "Elbchaussee 499, 22609 Nienstedten",
  "von": "2025-10-01",
  "bis": null,
  "zugewieseneMitarbeiter": ["uid1", "uid2"],
  "fuerAlle": false,
  "beschreibung": "101 O Dachsanierung",
  "erstelltAm": "timestamp"
}
```
Felder:
- `auftraggeberIstBaustelle`: wenn true, werden Name/Adresse vom Auftraggeber kopiert
- `von` / `bis`: Laufzeit der Baustelle. `bis: null` = offen. Baustelle gilt als geschlossen wenn `bis` in der Vergangenheit
- `zugewieseneMitarbeiter`: UIDs der zugewiesenen MA
- `fuerAlle`: wenn true, ist die Baustelle fuer alle MA sichtbar (keine spezielle Zuweisung noetig)

**Sichtbarkeit in PWA:**
MA sieht offene Baustellen, die entweder `fuerAlle: true` sind ODER seine UID in `zugewieseneMitarbeiter` enthalten. Geschlossene Baustellen werden nicht angezeigt.

---

### `zeiteintraege/{id}`
```json
{
  "id": "auto-id",
  "mitarbeiterId": "uid",
  "baustelleId": "baustellen-id",
  "datum": "2025-10-27",
  "modus": "standard",
  "gesamtstunden": 8.0,
  "positionen": [
    {
      "typ": "taetigkeit",
      "von": "07:00",
      "bis": "09:00",
      "beschreibung": "Moerteln",
      "stunden": 2.0
    },
    {
      "typ": "material",
      "taetigkeitIndex": 0,
      "bezeichnung": "Moertel",
      "menge": 5,
      "einheit": "Sack"
    },
    {
      "typ": "material",
      "taetigkeitIndex": 0,
      "bezeichnung": "Naegel",
      "menge": null,
      "einheit": "ohne"
    },
    {
      "typ": "taetigkeit",
      "von": "09:00",
      "bis": "09:30",
      "beschreibung": "Pause",
      "stunden": -0.5
    },
    {
      "typ": "taetigkeit",
      "von": "09:30",
      "bis": "12:00",
      "beschreibung": "Dachdecken",
      "stunden": 2.5
    },
    {
      "typ": "material",
      "taetigkeitIndex": 2,
      "bezeichnung": "Dachziegel",
      "menge": 200,
      "einheit": "Stk"
    }
  ],
  "status": "erfasst",
  "synchronisiert": true,
  "erstelltAm": "timestamp",
  "geaendertAm": "timestamp"
}
```
Status: `entwurf` | `erfasst` | `freigegeben`

**Positionen-Typen:**
- `taetigkeit`: Von/Bis-Zeiten + Beschreibung + berechnete Stunden
  - Pause wird als Taetigkeit mit negativen Stunden erfasst (z.B. -0.5)
- `material`: Gehoert zur vorherigen Taetigkeit (via `taetigkeitIndex`)
  - `bezeichnung`: Freitext mit Autocomplete aus History
  - `menge`: Zahlenwert, `null` bei Einheit "ohne" (z.B. Naegel, Schrauben)
  - `einheit`: `Stk` | `m` | `m2` | `VE` (Verpackungseinheit) | `ohne` (keine Mengenangabe)

**Gesamtstunden:** Summe aller Taetigkeits-Stunden (inkl. negative Pausen)

**Selbstlernende Vorschlaege:**
- Top 3 meistgenutzte Materialien der aktuellen Baustelle als Chips
- Autocomplete durchsucht eigene Materialeintraege der letzten 90 Tage
- Spaeter: LLM extrahiert strukturierte Materialliste aus Freitext

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
