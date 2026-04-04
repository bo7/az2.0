import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getMyBaustellen } from '@/lib/firestore';
import type { Baustelle } from '@/types';
import { X, Star, Search } from 'lucide-react';

interface BaustelleSelectorProps {
  open: boolean;
  onSelect: (b: Baustelle) => void;
  onClose: () => void;
  selectedId?: string;
}

export default function BaustelleSelector({
  open,
  onSelect,
  onClose,
  selectedId,
}: BaustelleSelectorProps) {
  const { mitarbeiter } = useAuth();
  const [baustellen, setBaustellen] = useState<Baustelle[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !mitarbeiter) return;

    let cancelled = false;

    async function load() {
      try {
        const list = await getMyBaustellen(mitarbeiter!.uid);
        if (!cancelled) setBaustellen(list);
      } catch {
        // silently handle
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    setLoading(true);
    void load();

    return () => {
      cancelled = true;
    };
  }, [open, mitarbeiter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return baustellen;
    const term = search.toLowerCase();
    return baustellen.filter(
      (b) =>
        b.name.toLowerCase().includes(term) ||
        b.adresse.toLowerCase().includes(term),
    );
  }, [baustellen, search]);

  if (!open) return null;

  const standardBaustelleId = mitarbeiter?.standardBaustelleId ?? null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label="Baustelle auswaehlen"
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border p-4">
        <button
          type="button"
          onClick={onClose}
          className="flex size-10 items-center justify-center rounded-lg transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Schliessen"
        >
          <X className="size-5" />
        </button>
        <h2 className="text-lg font-bold text-foreground">
          Baustelle auswaehlen
        </h2>
      </div>

      {/* Search */}
      <div className="border-b border-border p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="size-6 animate-spin rounded-full border-4 border-muted border-t-primary" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">
            Keine Baustellen gefunden.
          </p>
        )}

        <div className="flex flex-col gap-2">
          {filtered.map((b) => {
            const isSelected = b.id === selectedId;
            const isStandard = b.id === standardBaustelleId;

            return (
              <button
                key={b.id}
                type="button"
                onClick={() => onSelect(b)}
                className={`flex min-h-[56px] w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isSelected
                    ? 'border-accent bg-accent/10'
                    : 'border-border bg-card hover:bg-muted'
                }`}
              >
                <div className="flex-1">
                  <span className="block text-base font-bold text-foreground">
                    {b.name}
                  </span>
                  {b.adresse && (
                    <span className="block text-sm text-muted-foreground">
                      {b.adresse}
                    </span>
                  )}
                </div>
                {isStandard && (
                  <Star
                    className="size-5 shrink-0 fill-accent text-accent"
                    aria-label="Standard-Baustelle"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
