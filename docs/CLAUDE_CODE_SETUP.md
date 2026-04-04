# Claude Code Setup – az2.0

Anleitung um mit Claude Code + Stitch MCP die GUI zu generieren und danach die App zu bauen.

---

## Schritt 1: Claude Code starten

```bash
cd /home/sbo/programmieren/az2.0
claude
```

---

## Schritt 2: Stitch MCP verifizieren

Im Claude Code Chat:
```
/mcp
```
Sollte "stitch" als verbundenen MCP-Server zeigen.

Falls nicht:
```bash
export PATH="$HOME/google-cloud-sdk/bin:$PATH"
gcloud auth application-default login
```

---

## Schritt 3: Design-System initialisieren

Im Claude Code Chat:
```
Lies docs/STITCH_PROMPTS.md und initialisiere ein neues Stitch-Projekt 
fuer az2.0 mit dem dort definierten Design-System. Erstelle eine DESIGN.md 
im .stitch/ Ordner.
```

---

## Schritt 4: PWA Screens generieren

Einen nach dem anderen, Reihenfolge aus STITCH_PROMPTS.md:

```
Generiere Screen PWA-01 (Login) mit dem Stitch MCP. 
Nutze den Prompt aus docs/STITCH_PROMPTS.md.
Speichere den HTML-Code in designs/pwa/01-login.html
```

Dann fuer jeden weiteren Screen:
```
Generiere Screen PWA-02 bis PWA-07 nacheinander.
Behalte das Design-System konsistent (nutze extract_design_context nach dem ersten Screen).
```

---

## Schritt 5: Admin Screens generieren

```
Generiere alle Admin Screens (ADMIN-01 bis ADMIN-06) aus docs/STITCH_PROMPTS.md.
Speichere in designs/admin/
```

---

## Schritt 6: React-Komponenten generieren

```
Nutze den react:components Skill.
Konvertiere alle Stitch-Designs aus designs/pwa/ in React-Komponenten.
Zielordner: apps/pwa/src/components/
Stack: React + Tailwind CSS + shadcn/ui
```

```
Konvertiere alle Admin Designs aus designs/admin/ in React-Komponenten.
Zielordner: apps/admin/src/components/
```

---

## Projekt-Struktur nach Stitch

```
az2.0/
├── docs/
│   ├── OVERVIEW.md
│   ├── DATAMODEL.md
│   ├── PWA.md
│   ├── ADMIN.md
│   ├── STITCH_PROMPTS.md
│   └── CLAUDE_CODE_SETUP.md   (diese Datei)
├── designs/
│   ├── pwa/                   (Stitch HTML-Outputs)
│   └── admin/                 (Stitch HTML-Outputs)
├── .stitch/
│   └── DESIGN.md              (generiert von Stitch)
├── apps/
│   ├── pwa/                   (React PWA App)
│   └── admin/                 (React Admin App)
└── firebase/
    ├── firestore.rules
    └── firestore.indexes.json
```

---

## Firestore einrichten

```bash
npm install -g firebase-tools
firebase login
firebase init firestore --project secretary-cal
```

---

## Naechste Schritte nach GUI-Generierung

1. Firebase Projekt konfigurieren (secretary-cal)
2. Firestore Rules aus docs/DATAMODEL.md implementieren
3. Firebase Auth aktivieren (E-Mail/Passwort)
4. PWA: Vite + React + PWA Plugin aufsetzen
5. Admin: Vite + React aufsetzen
6. Shared: Firebase SDK, gemeinsame Types, gemeinsame Utils
7. Auth-Flow implementieren
8. Datenmodell-Collections in Firestore anlegen
9. Screens implementieren (Reihenfolge: Login → Heute → Kalender → Standard)
10. Offline-Sync implementieren (Workbox)
11. Export-Funktion (PDF/DOCX aus Wochenbericht)
