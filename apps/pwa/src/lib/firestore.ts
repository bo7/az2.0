import type {
  Mitarbeiter,
  Baustelle,
  Zeiteintrag,
  Abwesenheit,
  GlobaleEinstellungen,
} from '@/types';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// ---------------------------------------------------------------------------
// Mitarbeiter
// ---------------------------------------------------------------------------

export async function getMitarbeiter(uid: string): Promise<Mitarbeiter | null> {
  const snap = await getDoc(doc(db, 'mitarbeiter', uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as Mitarbeiter;
}

export async function updateMitarbeiter(
  uid: string,
  data: Partial<Mitarbeiter>,
): Promise<void> {
  await updateDoc(doc(db, 'mitarbeiter', uid), data);
}

// ---------------------------------------------------------------------------
// Baustellen
// ---------------------------------------------------------------------------

export async function getMyBaustellen(uid: string): Promise<Baustelle[]> {
  const col = collection(db, 'baustellen');

  // Firestore cannot do OR across different fields, so run two queries.
  const [fuerAlleSnap, zugewiesenSnap] = await Promise.all([
    getDocs(query(col, where('fuerAlle', '==', true))),
    getDocs(query(col, where('zugewieseneMitarbeiter', 'array-contains', uid))),
  ]);

  // Merge and deduplicate by id.
  const map = new Map<string, Baustelle>();
  for (const snap of [...fuerAlleSnap.docs, ...zugewiesenSnap.docs]) {
    if (!map.has(snap.id)) {
      map.set(snap.id, { id: snap.id, ...snap.data() } as Baustelle);
    }
  }

  // Filter out closed Baustellen (bis is set and in the past).
  const today = new Date().toISOString().slice(0, 10);
  return Array.from(map.values()).filter(
    (b) => !b.bis || b.bis >= today,
  );
}

// ---------------------------------------------------------------------------
// Zeiteintraege
// ---------------------------------------------------------------------------

export async function getZeiteintraege(
  uid: string,
  von: string,
  bis: string,
): Promise<Zeiteintrag[]> {
  const q = query(
    collection(db, 'zeiteintraege'),
    where('mitarbeiterId', '==', uid),
    where('datum', '>=', von),
    where('datum', '<=', bis),
    orderBy('datum', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Zeiteintrag);
}

export async function getZeiteintragById(
  id: string,
): Promise<Zeiteintrag | null> {
  const snap = await getDoc(doc(db, 'zeiteintraege', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Zeiteintrag;
}

export async function getZeiteintraegeForDate(
  uid: string,
  datum: string,
): Promise<Zeiteintrag[]> {
  const q = query(
    collection(db, 'zeiteintraege'),
    where('mitarbeiterId', '==', uid),
    where('datum', '==', datum),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Zeiteintrag);
}

export async function createZeiteintrag(
  data: Omit<Zeiteintrag, 'id' | 'erstelltAm' | 'geaendertAm'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'zeiteintraege'), {
    ...data,
    erstelltAm: serverTimestamp(),
    geaendertAm: serverTimestamp(),
  });
  return ref.id;
}

export async function updateZeiteintrag(
  id: string,
  data: Partial<Zeiteintrag>,
): Promise<void> {
  await updateDoc(doc(db, 'zeiteintraege', id), {
    ...data,
    geaendertAm: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Abwesenheiten
// ---------------------------------------------------------------------------

export async function getAbwesenheiten(
  uid: string,
  von: string,
  bis: string,
): Promise<Abwesenheit[]> {
  const q = query(
    collection(db, 'abwesenheiten'),
    where('mitarbeiterId', '==', uid),
    where('datum', '>=', von),
    where('datum', '<=', bis),
    orderBy('datum', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Abwesenheit);
}

export async function createAbwesenheit(
  data: Omit<Abwesenheit, 'id'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'abwesenheiten'), data);
  return ref.id;
}

// ---------------------------------------------------------------------------
// Einstellungen
// ---------------------------------------------------------------------------

export async function getGlobaleEinstellungen(): Promise<GlobaleEinstellungen | null> {
  const snap = await getDoc(doc(db, 'einstellungen', 'global'));
  if (!snap.exists()) return null;
  return snap.data() as GlobaleEinstellungen;
}
