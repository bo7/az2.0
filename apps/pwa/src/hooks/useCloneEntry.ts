import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getZeiteintraege, createZeiteintrag } from '@/lib/firestore';
import type { Zeiteintrag, Position, MaterialPosition } from '@/types';

export interface CloneOption {
  label: string;
  date: string;
  entries: Zeiteintrag[];
}

export interface UseCloneEntryResult {
  cloneOption: CloneOption | null;
  cloneEntries: (targetDate: string) => Promise<string[]>;
  loading: boolean;
}

function getLastWorkdayInfo(): { label: string; startOffset: number } {
  const day = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  if (day === 1) {
    // Monday -> look back to Friday (3 days)
    return { label: 'Wie Freitag', startOffset: 3 };
  }
  if (day === 6) {
    // Saturday -> look back to Friday (1 day)
    return { label: 'Wie gestern', startOffset: 1 };
  }
  // Tuesday-Friday -> look back 1 day
  return { label: 'Wie gestern', startOffset: 1 };
}

function dateMinusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function clearMaterialMenge(positionen: Position[]): Position[] {
  return positionen.map((p) => {
    if (p.typ === 'material') {
      return { ...p, menge: null } satisfies MaterialPosition;
    }
    return p;
  });
}

export function useCloneEntry(): UseCloneEntryResult {
  const { mitarbeiter } = useAuth();
  const [cloneOption, setCloneOption] = useState<CloneOption | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mitarbeiter) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function findCloneSource() {
      try {
        const { label, startOffset } = getLastWorkdayInfo();
        const maxLookback = 7;

        // Load last 7 days of entries
        const von = dateMinusDays(maxLookback);
        const bis = dateMinusDays(1);
        const entries = await getZeiteintraege(mitarbeiter!.uid, von, bis);

        if (cancelled) return;

        // Starting from the preferred offset, look for a day with entries
        for (let offset = startOffset; offset <= maxLookback; offset++) {
          const dateStr = dateMinusDays(offset);
          const dayEntries = entries.filter((e) => e.datum === dateStr);
          if (dayEntries.length > 0) {
            setCloneOption({
              label: offset === startOffset ? label : `Wie ${new Intl.DateTimeFormat('de-DE', { weekday: 'long' }).format(new Date(dateStr))}`,
              date: dateStr,
              entries: dayEntries,
            });
            return;
          }
        }

        setCloneOption(null);
      } catch {
        setCloneOption(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void findCloneSource();

    return () => {
      cancelled = true;
    };
  }, [mitarbeiter]);

  const cloneEntries = useCallback(
    async (targetDate: string): Promise<string[]> => {
      if (!cloneOption || !mitarbeiter) return [];

      const ids: string[] = [];
      for (const entry of cloneOption.entries) {
        const id = await createZeiteintrag({
          mitarbeiterId: mitarbeiter.uid,
          baustelleId: entry.baustelleId,
          datum: targetDate,
          modus: entry.modus,
          gesamtstunden: entry.gesamtstunden,
          positionen: clearMaterialMenge(entry.positionen),
          status: 'entwurf',
          synchronisiert: false,
        });
        ids.push(id);
      }
      return ids;
    },
    [cloneOption, mitarbeiter],
  );

  return { cloneOption, cloneEntries, loading };
}
