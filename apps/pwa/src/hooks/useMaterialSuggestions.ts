import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getZeiteintraege } from '@/lib/firestore';
import type { MaterialPosition } from '@/types';

interface UseMaterialSuggestionsResult {
  suggestions: string[];
  loading: boolean;
}

export function useMaterialSuggestions(
  baustelleId: string | null,
): UseMaterialSuggestionsResult {
  const { mitarbeiter } = useAuth();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!mitarbeiter || !baustelleId) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const now = new Date();
        const bis = now.toISOString().slice(0, 10);
        const von = new Date(now);
        von.setDate(von.getDate() - 90);
        const vonStr = von.toISOString().slice(0, 10);

        const entries = await getZeiteintraege(mitarbeiter!.uid, vonStr, bis);

        if (cancelled) return;

        // Filter by baustelleId and extract material bezeichnungen
        const siteEntries = entries.filter(
          (e) => e.baustelleId === baustelleId,
        );

        const counts = new Map<string, number>();
        for (const entry of siteEntries) {
          for (const pos of entry.positionen) {
            if (pos.typ === 'material') {
              const mat = pos as MaterialPosition;
              const name = mat.bezeichnung.trim();
              if (name) {
                counts.set(name, (counts.get(name) ?? 0) + 1);
              }
            }
          }
        }

        // Sort by frequency, return top 5
        const sorted = Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name]) => name);

        setSuggestions(sorted);
      } catch {
        setSuggestions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [mitarbeiter, baustelleId]);

  return { suggestions, loading };
}
