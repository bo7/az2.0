import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getZeiteintraege, getMyBaustellen } from '@/lib/firestore';
import type { Zeiteintrag, Baustelle, TaetigkeitPosition } from '@/types';

export interface SmartDefaults {
  baustelleId: string | null;
  baustelleName: string | null;
  von: string;
  bis: string;
  beschreibung: string | null;
}

export interface UseSmartDefaultsResult {
  defaults: SmartDefaults | null;
  loading: boolean;
}

function modeOfValues(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [val, count] of counts) {
    if (count > bestCount) {
      best = val;
      bestCount = count;
    }
  }
  return best;
}

function mostFrequentBaustelle(entries: Zeiteintrag[]): string | null {
  const counts = new Map<string, number>();
  for (const e of entries) {
    counts.set(e.baustelleId, (counts.get(e.baustelleId) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [id, count] of counts) {
    if (count > bestCount) {
      best = id;
      bestCount = count;
    }
  }
  return best;
}

function yesterdayDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function findBaustelleName(
  baustellen: Baustelle[],
  baustelleId: string | null,
): string | null {
  if (!baustelleId) return null;
  const found = baustellen.find((b) => b.id === baustelleId);
  return found?.name ?? null;
}

export function useSmartDefaults(): UseSmartDefaultsResult {
  const { mitarbeiter } = useAuth();
  const [defaults, setDefaults] = useState<SmartDefaults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mitarbeiter) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function compute() {
      try {
        const now = new Date();
        const bis = now.toISOString().slice(0, 10);
        const von = new Date(now);
        von.setDate(von.getDate() - 30);
        const vonStr = von.toISOString().slice(0, 10);

        const [entries, baustellen] = await Promise.all([
          getZeiteintraege(mitarbeiter!.uid, vonStr, bis),
          getMyBaustellen(mitarbeiter!.uid),
        ]);

        if (cancelled) return;

        // Determine baustelleId
        const standardId = mitarbeiter!.standardBaustelleId;
        const yesterday = yesterdayDate();
        const yesterdayEntries = entries.filter((e) => e.datum === yesterday);
        const yesterdayBaustelle =
          yesterdayEntries.length > 0 ? yesterdayEntries[0].baustelleId : null;

        let baustelleId: string | null = null;
        if (standardId) {
          baustelleId = standardId;
        } else if (yesterdayBaustelle) {
          baustelleId = yesterdayBaustelle;
        } else {
          baustelleId = mostFrequentBaustelle(entries);
        }

        // Determine von/bis from last 14 entries
        const recent = entries.slice(-14);
        const taetigkeiten = recent.flatMap((e) =>
          e.positionen.filter(
            (p): p is TaetigkeitPosition => p.typ === 'taetigkeit',
          ),
        );

        const vonValues = taetigkeiten
          .map((t) => t.von)
          .filter((v) => v !== '');
        const bisValues = taetigkeiten
          .map((t) => t.bis)
          .filter((v) => v !== '');

        const vonTime = modeOfValues(vonValues) ?? '07:00';
        // For bis, take the latest taetigkeit bis per entry as the overall end time
        const entryEndTimes = recent
          .map((e) => {
            const tasks = e.positionen.filter(
              (p): p is TaetigkeitPosition => p.typ === 'taetigkeit',
            );
            if (tasks.length === 0) return null;
            return tasks.reduce((latest, t) =>
              t.bis > latest.bis ? t : latest,
            ).bis;
          })
          .filter((v): v is string => v !== null && v !== '');

        const bisTime =
          modeOfValues(entryEndTimes.length > 0 ? entryEndTimes : bisValues) ??
          '16:00';

        // Determine beschreibung: last entry's first taetigkeit on same baustelle
        let beschreibung: string | null = null;
        if (baustelleId) {
          const sameSite = entries
            .filter((e) => e.baustelleId === baustelleId)
            .reverse();
          for (const entry of sameSite) {
            const firstTask = entry.positionen.find(
              (p): p is TaetigkeitPosition => p.typ === 'taetigkeit',
            );
            if (firstTask) {
              beschreibung = firstTask.beschreibung || null;
              break;
            }
          }
        }

        const baustelleName = findBaustelleName(baustellen, baustelleId);

        setDefaults({
          baustelleId,
          baustelleName,
          von: vonTime,
          bis: bisTime,
          beschreibung,
        });
      } catch {
        setDefaults(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void compute();

    return () => {
      cancelled = true;
    };
  }, [mitarbeiter]);

  return { defaults, loading };
}
