import type { Timestamp } from 'firebase/firestore';

// --- Rollen ---
export type Rolle = 'mitarbeiter' | 'vorarbeiter' | 'admin';

// --- Mitarbeiter-Einstellungen ---
export interface MitarbeiterEinstellungen {
  pauseAbziehen: boolean;
  pauseDauer: string; // "00:30"
  wochenstundenSoll: number;
}

// --- mitarbeiter/{uid} ---
export interface Mitarbeiter {
  uid: string;
  name: string;
  email: string;
  rolle: Rolle;
  aktiv: boolean;
  einstellungen: MitarbeiterEinstellungen;
  standardBaustelleId: string | null;
  erstelltAm: Timestamp;
}

// --- auftraggeber/{id} ---
export interface Auftraggeber {
  id: string;
  name: string;
  anschrift: string;
  telefon: string;
  email: string;
  aktiv: boolean;
}

// --- baustellen/{id} ---
export interface Baustelle {
  id: string;
  name: string;
  auftraggeberId: string;
  auftraggeberIstBaustelle: boolean;
  adresse: string;
  von: string; // "2025-10-01"
  bis: string | null;
  zugewieseneMitarbeiter: string[];
  fuerAlle: boolean;
  beschreibung: string;
  erstelltAm: Timestamp;
}

// --- Position types for zeiteintraege ---
export type Einheit = 'Stk' | 'm' | 'm2' | 'VE' | 'ohne';
export type PositionTyp = 'taetigkeit' | 'material';

export interface TaetigkeitPosition {
  typ: 'taetigkeit';
  von: string; // "07:00"
  bis: string; // "09:00"
  beschreibung: string;
  stunden: number; // negative for Pause
}

export interface MaterialPosition {
  typ: 'material';
  taetigkeitIndex: number;
  bezeichnung: string;
  menge: number | null; // null for einheit "ohne"
  einheit: Einheit;
}

export type Position = TaetigkeitPosition | MaterialPosition;

// --- zeiteintraege/{id} ---
export type Modus = 'supereasy' | 'standard';
export type ZeiteintragStatus = 'entwurf' | 'erfasst' | 'freigegeben';

export interface Zeiteintrag {
  id: string;
  mitarbeiterId: string;
  baustelleId: string;
  datum: string; // "2025-10-27"
  modus: Modus;
  gesamtstunden: number;
  positionen: Position[];
  status: ZeiteintragStatus;
  synchronisiert: boolean;
  erstelltAm: Timestamp;
  geaendertAm: Timestamp;
}

// --- abwesenheiten/{id} ---
export type AbwesenheitArt = 'krank' | 'urlaub' | 'feiertag' | 'sonstiges';

export interface Abwesenheit {
  id: string;
  mitarbeiterId: string;
  datum: string;
  art: AbwesenheitArt;
  ganzerTag: boolean;
  stunden: number;
  notiz: string;
}

// --- einstellungen/global ---
export interface GlobaleEinstellungen {
  wochenstundenSoll: number;
  arbeitstageProWoche: string[];
  standardPauseDauer: number;
  pauseAutomatischAbziehen: boolean;
  lernvorschlaege: boolean;
}
