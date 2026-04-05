import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getMyBaustellen } from '@/lib/firestore';
import type { Baustelle } from '@/types';
import { Button } from '@/components/ui/button';
import { Search, Star } from 'lucide-react';

export default function Baustellen() {
  const navigate = useNavigate();
  const { mitarbeiter } = useAuth();

  const [baustellen, setBaustellen] = useState<Baustelle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (!mitarbeiter) return;
    let cancelled = false;

    async function load() {
      try {
        const list = await getMyBaustellen(mitarbeiter!.uid);
        if (!cancelled) setBaustellen(list);
      } catch {
        // Silently handle
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [mitarbeiter]);

  const filtered = useMemo(() => {
    if (!searchText.trim()) return baustellen;
    const lower = searchText.toLowerCase();
    return baustellen.filter(
      (b) =>
        b.name.toLowerCase().includes(lower) ||
        b.adresse.toLowerCase().includes(lower),
    );
  }, [baustellen, searchText]);

  const isStandard = (id: string) =>
    mitarbeiter?.einstellungen?.standardBaustelleId === id;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <div className="text-center">
          <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-lg text-muted-foreground">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col p-4">
      <h1 className="mb-4 text-xl font-bold text-foreground">Baustellen</h1>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Baustelle suchen..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="h-12 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Baustelle suchen"
        />
      </div>

      {/* List */}
      {filtered.length === 0 && (
        <p className="mt-8 text-center text-muted-foreground">
          {searchText.trim()
            ? 'Keine Baustellen gefunden.'
            : 'Keine Baustellen zugewiesen.'}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {filtered.map((b) => (
          <div
            key={b.id}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-bold text-foreground">
                  {b.name}
                </h2>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {b.adresse}
                </p>
              </div>
              {isStandard(b.id) && (
                <Star
                  className="mt-0.5 size-5 shrink-0 fill-accent text-accent"
                  aria-label="Standard-Baustelle"
                />
              )}
            </div>
            <Button
              className="mt-3 h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-foreground hover:bg-accent/90 active:bg-accent/80"
              onClick={() =>
                navigate('/supereasy', { state: { baustelleId: b.id } })
              }
            >
              Neuer Eintrag
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
