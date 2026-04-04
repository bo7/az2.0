import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getZeiteintraege } from '@/lib/firestore';
import type { TaetigkeitPosition } from '@/types';

export interface Suggestion {
  text: string;
  score: number;
}

export interface UseTaetigkeitSuggestionsResult {
  suggestions: Suggestion[];
  loading: boolean;
}

export function useTaetigkeitSuggestions(
  baustelleId: string | null,
): UseTaetigkeitSuggestionsResult {
  const { mitarbeiter } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
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
        von.setDate(von.getDate() - 90);
        const vonStr = von.toISOString().slice(0, 10);

        const entries = await getZeiteintraege(mitarbeiter!.uid, vonStr, bis);

        if (cancelled) return;

        // Extract all taetigkeit descriptions with metadata
        const todayDay = now.getDay(); // 0=Sun, 1=Mon, ...
        const nowMs = now.getTime();

        interface DescEntry {
          text: string;
          datum: string;
          baustelleId: string;
          weekday: number;
        }

        const descEntries: DescEntry[] = [];

        for (const entry of entries) {
          const entryDate = new Date(entry.datum);
          const weekday = entryDate.getDay();

          for (const pos of entry.positionen) {
            if (pos.typ !== 'taetigkeit') continue;
            const t = pos as TaetigkeitPosition;
            if (!t.beschreibung || t.beschreibung.trim() === '') continue;
            // Skip pause entries (negative stunden)
            if (t.stunden < 0) continue;

            descEntries.push({
              text: t.beschreibung.trim(),
              datum: entry.datum,
              baustelleId: entry.baustelleId,
              weekday,
            });
          }
        }

        // Group by text (case-insensitive)
        const grouped = new Map<
          string,
          { text: string; entries: DescEntry[] }
        >();

        for (const d of descEntries) {
          const key = d.text.toLowerCase();
          const existing = grouped.get(key);
          if (existing) {
            existing.entries.push(d);
          } else {
            grouped.set(key, { text: d.text, entries: [d] });
          }
        }

        if (grouped.size === 0) {
          setSuggestions([]);
          setLoading(false);
          return;
        }

        // Compute max frequency for normalization
        let maxFreq = 0;
        for (const group of grouped.values()) {
          if (group.entries.length > maxFreq) {
            maxFreq = group.entries.length;
          }
        }

        const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

        const scored: Suggestion[] = [];

        for (const group of grouped.values()) {
          const freq = group.entries.length;

          // Frequency score: normalized 0-1
          const frequencyScore = maxFreq > 0 ? freq / maxFreq : 0;

          // Recency score: based on most recent occurrence (0-1, 1 = today)
          let mostRecentMs = 0;
          for (const e of group.entries) {
            const ms = new Date(e.datum).getTime();
            if (ms > mostRecentMs) mostRecentMs = ms;
          }
          const ageMs = nowMs - mostRecentMs;
          const recencyScore = Math.max(0, 1 - ageMs / ninetyDaysMs);

          // Site match score: fraction of entries on this baustelle
          let siteMatchScore = 0;
          if (baustelleId) {
            const siteCount = group.entries.filter(
              (e) => e.baustelleId === baustelleId,
            ).length;
            siteMatchScore = siteCount / freq;
          }

          // Day pattern score: fraction of entries on same weekday
          const dayCount = group.entries.filter(
            (e) => e.weekday === todayDay,
          ).length;
          const dayPatternScore = dayCount / freq;

          const score =
            frequencyScore * 0.4 +
            recencyScore * 0.3 +
            siteMatchScore * 0.2 +
            dayPatternScore * 0.1;

          scored.push({ text: group.text, score });
        }

        // Sort by score descending, take top 8
        scored.sort((a, b) => b.score - a.score);
        setSuggestions(scored.slice(0, 8));
      } catch {
        setSuggestions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void compute();

    return () => {
      cancelled = true;
    };
  }, [mitarbeiter, baustelleId]);

  return { suggestions, loading };
}
