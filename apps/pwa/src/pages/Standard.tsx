import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSmartDefaults } from '@/hooks/useSmartDefaults';
import { useMaterialSuggestions } from '@/hooks/useMaterialSuggestions';
import { createZeiteintrag, getMyBaustellen } from '@/lib/firestore';
import { cn } from '@/lib/utils';
import type {
  Position,
  TaetigkeitPosition,
  MaterialPosition,
  Baustelle,
} from '@/types';
import { Button } from '@/components/ui/button';
import MaterialInput from '@/components/form/MaterialInput';
import { ArrowLeft, Plus, Coffee, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatGermanDate(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

/** Parse "HH:MM" to total minutes */
function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Compute hours between two time strings. Returns negative if bis < von */
function computeStunden(von: string, bis: string): number {
  if (!von || !bis) return 0;
  const diff = parseTime(bis) - parseTime(von);
  return Math.round((diff / 60) * 100) / 100;
}

/** Format a number with German comma separator (e.g. 2.5 -> "2,5") */
function formatStunden(n: number): string {
  return n.toFixed(1).replace('.', ',');
}

/** Get the bis time of the last taetigkeit in the positions array */
function getLastBis(positionen: Position[]): string {
  for (let i = positionen.length - 1; i >= 0; i--) {
    const p = positionen[i];
    if (p.typ === 'taetigkeit') {
      return p.bis || '';
    }
  }
  return '';
}

/** Find the index of the last taetigkeit in positions */
function getLastTaetigkeitIndex(positionen: Position[]): number {
  let idx = -1;
  let tIdx = 0;
  for (let i = 0; i < positionen.length; i++) {
    if (positionen[i].typ === 'taetigkeit') {
      idx = tIdx;
      tIdx++;
    }
  }
  return idx;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Standard() {
  const navigate = useNavigate();
  const { mitarbeiter } = useAuth();
  const { defaults, loading: defaultsLoading } = useSmartDefaults();

  const [positionen, setPositionen] = useState<Position[]>([]);
  const [baustelleId, setBaustelleId] = useState<string | null>(null);
  const [baustelleName, setBaustelleName] = useState<string | null>(null);
  const [baustellen, setBaustellen] = useState<Baustelle[]>([]);
  const [showBaustellenPicker, setShowBaustellenPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingBaustellen, setLoadingBaustellen] = useState(true);

  const datum = todayString();
  const today = new Date();

  const { suggestions: materialSuggestions } =
    useMaterialSuggestions(baustelleId);

  // Load baustellen
  useEffect(() => {
    if (!mitarbeiter) return;
    let cancelled = false;

    async function load() {
      try {
        const list = await getMyBaustellen(mitarbeiter!.uid);
        if (!cancelled) setBaustellen(list);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoadingBaustellen(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [mitarbeiter]);

  // Apply smart defaults once loaded
  useEffect(() => {
    if (!defaults) return;
    if (baustelleId !== null) return; // already set by user

    setBaustelleId(defaults.baustelleId);
    setBaustelleName(defaults.baustelleName);

    // Seed first taetigkeit row from defaults
    if (positionen.length === 0) {
      const stunden = computeStunden(defaults.von, defaults.bis);
      setPositionen([
        {
          typ: 'taetigkeit',
          von: defaults.von,
          bis: defaults.bis,
          beschreibung: defaults.beschreibung ?? '',
          stunden,
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaults]);

  // Compute gesamtstunden
  const gesamtstunden = positionen.reduce((sum, p) => {
    if (p.typ === 'taetigkeit') return sum + p.stunden;
    return sum;
  }, 0);

  // --- Position mutation helpers ---

  const updatePosition = useCallback(
    (index: number, updated: Position) => {
      setPositionen((prev) => {
        const next = [...prev];
        next[index] = updated;
        return next;
      });
    },
    [],
  );

  const deletePosition = useCallback((index: number) => {
    setPositionen((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  }, []);

  const addTaetigkeit = useCallback(() => {
    const lastBis = getLastBis(positionen);
    const newPos: TaetigkeitPosition = {
      typ: 'taetigkeit',
      von: lastBis,
      bis: '',
      beschreibung: '',
      stunden: 0,
    };
    setPositionen((prev) => [...prev, newPos]);
  }, [positionen]);

  const addPause = useCallback(() => {
    const lastBis = getLastBis(positionen);
    const pauseBis = lastBis
      ? (() => {
          const mins = parseTime(lastBis) + 30;
          const h = Math.floor(mins / 60);
          const m = mins % 60;
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        })()
      : '';
    const stunden = computeStunden(lastBis, pauseBis);
    const newPos: TaetigkeitPosition = {
      typ: 'taetigkeit',
      von: lastBis,
      bis: pauseBis,
      beschreibung: 'Pause',
      stunden: -Math.abs(stunden),
    };
    setPositionen((prev) => [...prev, newPos]);
  }, [positionen]);

  const addMaterial = useCallback(() => {
    const tIdx = getLastTaetigkeitIndex(positionen);
    if (tIdx < 0) return; // need at least one taetigkeit
    const newPos: MaterialPosition = {
      typ: 'material',
      taetigkeitIndex: tIdx,
      bezeichnung: '',
      menge: 1,
      einheit: 'Stk',
    };
    setPositionen((prev) => [...prev, newPos]);
  }, [positionen]);

  // --- Save ---

  const handleSave = useCallback(async () => {
    if (!mitarbeiter || !baustelleId) return;
    if (positionen.length === 0) return;

    setSubmitting(true);
    try {
      await createZeiteintrag({
        mitarbeiterId: mitarbeiter.uid,
        baustelleId,
        datum,
        modus: 'standard',
        gesamtstunden,
        positionen,
        status: 'entwurf',
        synchronisiert: false,
      });
      navigate('/');
    } catch {
      // silent for now
    } finally {
      setSubmitting(false);
    }
  }, [mitarbeiter, baustelleId, datum, gesamtstunden, positionen, navigate]);

  // --- Baustelle selection ---

  function selectBaustelle(b: Baustelle) {
    setBaustelleId(b.id);
    setBaustelleName(b.name);
    setShowBaustellenPicker(false);
  }

  // --- Loading ---

  const loading = defaultsLoading || loadingBaustellen;

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

  // --- Taetigkeit count for checking if we can add material ---
  const hasTaetigkeit = positionen.some((p) => p.typ === 'taetigkeit');

  return (
    <div className="flex min-h-full flex-col pb-36">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background px-4 py-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex size-10 items-center justify-center rounded-md hover:bg-muted"
          aria-label="Zurueck"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Standard</h1>
        </div>
        <span className="text-sm text-muted-foreground">
          {formatGermanDate(today)}
        </span>
      </header>

      {/* Baustelle selector */}
      <div className="px-4 pt-4 pb-2">
        <button
          type="button"
          onClick={() => setShowBaustellenPicker((v) => !v)}
          className={cn(
            'h-12 w-full rounded-lg border px-4 text-left text-sm font-medium transition-colors',
            baustelleId
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-border bg-muted text-muted-foreground',
          )}
          aria-label="Baustelle auswaehlen"
        >
          {baustelleName ?? 'Baustelle auswaehlen...'}
        </button>

        {showBaustellenPicker && (
          <ul className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-card shadow-md">
            {baustellen.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => selectBaustelle(b)}
                  className={cn(
                    'w-full px-4 py-3 text-left text-sm hover:bg-muted',
                    b.id === baustelleId && 'bg-primary/5 font-medium text-primary',
                  )}
                >
                  {b.name}
                </button>
              </li>
            ))}
            {baustellen.length === 0 && (
              <li className="px-4 py-3 text-sm text-muted-foreground">
                Keine Baustellen verfuegbar
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Position rows */}
      <div className="flex flex-col gap-0 px-4 pt-2">
        {positionen.map((pos, index) => {
          if (pos.typ === 'taetigkeit') {
            const isPause =
              pos.beschreibung.toLowerCase() === 'pause';

            return (
              <TaetigkeitRow
                key={`t-${index}`}
                position={pos}
                isPause={isPause}
                onChange={(updated) => updatePosition(index, updated)}
                onDelete={() => deletePosition(index)}
              />
            );
          }

          // Material row
          return (
            <MaterialInput
              key={`m-${index}`}
              value={{
                bezeichnung: pos.bezeichnung,
                menge: pos.menge,
                einheit: pos.einheit,
              }}
              onChange={(v) =>
                updatePosition(index, {
                  ...pos,
                  bezeichnung: v.bezeichnung,
                  menge: v.menge,
                  einheit: v.einheit,
                })
              }
              onDelete={() => deletePosition(index)}
              suggestions={materialSuggestions}
            />
          );
        })}

        {positionen.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Noch keine Positionen. Fuege eine Taetigkeit hinzu.
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 px-4 pt-4">
        <Button
          variant="outline"
          className="h-10 gap-1.5 border-accent text-accent hover:bg-accent/10"
          onClick={addTaetigkeit}
        >
          <Plus className="size-4" />
          Taetigkeit
        </Button>

        <Button
          variant="outline"
          className="h-10 gap-1.5"
          onClick={addMaterial}
          disabled={!hasTaetigkeit}
        >
          <Plus className="size-4" />
          Material
        </Button>

        <Button
          variant="outline"
          className="h-10 gap-1.5 text-muted-foreground"
          onClick={addPause}
        >
          <Coffee className="size-4" />
          Pause
        </Button>
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed right-0 bottom-16 left-0 z-10 border-t border-border bg-background px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Gesamtstunden
          </span>
          <span
            className={cn(
              'text-lg font-bold',
              gesamtstunden < 0 ? 'text-destructive' : 'text-foreground',
            )}
          >
            {formatStunden(gesamtstunden)} h
          </span>
        </div>
        <Button
          className="h-12 w-full bg-accent text-base font-bold text-accent-foreground hover:bg-accent/90"
          onClick={handleSave}
          disabled={
            submitting || !baustelleId || positionen.length === 0
          }
        >
          {submitting ? 'Wird gespeichert...' : 'Speichern'}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TaetigkeitRow sub-component
// ---------------------------------------------------------------------------

interface TaetigkeitRowProps {
  position: TaetigkeitPosition;
  isPause: boolean;
  onChange: (updated: TaetigkeitPosition) => void;
  onDelete: () => void;
}

function TaetigkeitRow({
  position,
  isPause,
  onChange,
  onDelete,
}: TaetigkeitRowProps) {
  function handleVonChange(von: string) {
    const stunden = computeStunden(von, position.bis);
    const adjustedStunden = isPause ? -Math.abs(stunden) : stunden;
    onChange({ ...position, von, stunden: adjustedStunden });
  }

  function handleBisChange(bis: string) {
    const stunden = computeStunden(position.von, bis);
    const adjustedStunden = isPause ? -Math.abs(stunden) : stunden;
    onChange({ ...position, bis, stunden: adjustedStunden });
  }

  function handleBeschreibungChange(beschreibung: string) {
    const nowPause = beschreibung.toLowerCase() === 'pause';
    const stunden = computeStunden(position.von, position.bis);
    onChange({
      ...position,
      beschreibung,
      stunden: nowPause ? -Math.abs(stunden) : stunden,
    });
  }

  return (
    <div className="flex flex-col gap-2 border-b border-border bg-background py-3">
      {/* Row 1: Von - Bis | Stunden | Delete */}
      <div className="flex items-center gap-2">
        <input
          type="time"
          value={position.von}
          onChange={(e) => handleVonChange(e.target.value)}
          className="h-10 w-[5.5rem] rounded-md border border-input bg-background px-2 text-center text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Von"
        />
        <span className="text-xs text-muted-foreground" aria-hidden="true">
          -
        </span>
        <input
          type="time"
          value={position.bis}
          onChange={(e) => handleBisChange(e.target.value)}
          className="h-10 w-[5.5rem] rounded-md border border-input bg-background px-2 text-center text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Bis"
        />

        <span
          className={cn(
            'ml-auto min-w-[3.5rem] text-right text-sm font-semibold',
            isPause ? 'text-destructive' : 'text-foreground',
          )}
        >
          {formatStunden(position.stunden)} h
        </span>

        <button
          type="button"
          onClick={onDelete}
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label="Position entfernen"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Row 2: Beschreibung */}
      <input
        type="text"
        value={position.beschreibung}
        onChange={(e) => handleBeschreibungChange(e.target.value)}
        placeholder="Beschreibung"
        className={cn(
          'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isPause && 'text-destructive',
        )}
        aria-label="Beschreibung"
      />
    </div>
  );
}

