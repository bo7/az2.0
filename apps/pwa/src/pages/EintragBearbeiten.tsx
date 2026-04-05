import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  getZeiteintragById,
  getMyBaustellen,
  updateZeiteintrag,
} from '@/lib/firestore';
import type {
  Zeiteintrag,
  Baustelle,
  Position,
  TaetigkeitPosition,
  MaterialPosition,
  Einheit,
} from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatGermanDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

function timeToMinutes(time: string): number {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function computeGesamtstunden(positionen: Position[]): number {
  return positionen.reduce((sum, p) => {
    if (p.typ === 'taetigkeit') return sum + p.stunden;
    return sum;
  }, 0);
}

const EINHEITEN: Einheit[] = ['Stk', 'm', 'm2', 'VE', 'ohne'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EintragBearbeiten() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { mitarbeiter } = useAuth();

  const [eintrag, setEintrag] = useState<Zeiteintrag | null>(null);
  const [baustellen, setBaustellen] = useState<Baustelle[]>([]);
  const [positionen, setPositionen] = useState<Position[]>([]);
  const [baustelleId, setBaustelleId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !mitarbeiter) return;
    let cancelled = false;

    async function load() {
      try {
        const [ze, bs] = await Promise.all([
          getZeiteintragById(id!),
          getMyBaustellen(mitarbeiter!.uid),
        ]);
        if (cancelled) return;
        if (!ze) {
          setError('Eintrag nicht gefunden.');
          setLoading(false);
          return;
        }
        setEintrag(ze);
        setPositionen([...ze.positionen]);
        setBaustelleId(ze.baustelleId);
        setBaustellen(bs);
      } catch {
        setError('Fehler beim Laden.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [id, mitarbeiter]);

  const baustelleMap = new Map(baustellen.map((b) => [b.id, b.name]));

  // Update a taetigkeit position
  const updatePosition = useCallback(
    (index: number, updates: Partial<TaetigkeitPosition>) => {
      setPositionen((prev) =>
        prev.map((p, i) => {
          if (i !== index || p.typ !== 'taetigkeit') return p;
          return { ...p, ...updates } as TaetigkeitPosition;
        }),
      );
    },
    [],
  );

  // Update a material position
  const updateMaterial = useCallback(
    (index: number, updates: Partial<MaterialPosition>) => {
      setPositionen((prev) =>
        prev.map((p, i) => {
          if (i !== index || p.typ !== 'material') return p;
          return { ...p, ...updates } as MaterialPosition;
        }),
      );
    },
    [],
  );

  // Remove a position
  const removePosition = useCallback((index: number) => {
    setPositionen((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Add taetigkeit
  const addTaetigkeit = useCallback(() => {
    const lastTaetigkeit = [...positionen]
      .reverse()
      .find((p) => p.typ === 'taetigkeit') as TaetigkeitPosition | undefined;
    setPositionen((prev) => [
      ...prev,
      {
        typ: 'taetigkeit',
        von: lastTaetigkeit?.bis ?? '',
        bis: '',
        beschreibung: '',
        stunden: 0,
      },
    ]);
  }, [positionen]);

  // Add material
  const addMaterial = useCallback(() => {
    const lastTaetigkeitIdx = positionen.reduce(
      (last, p, i) => (p.typ === 'taetigkeit' ? i : last),
      0,
    );
    setPositionen((prev) => [
      ...prev,
      {
        typ: 'material',
        taetigkeitIndex: lastTaetigkeitIdx,
        bezeichnung: '',
        menge: null,
        einheit: 'Stk' as Einheit,
      },
    ]);
  }, [positionen]);

  // Auto-compute stunden when von/bis changes
  const recalcStunden = useCallback(
    (index: number, von: string, bis: string) => {
      const minutes = timeToMinutes(bis) - timeToMinutes(von);
      const stunden = Math.max(0, minutes / 60);
      updatePosition(index, { von, bis, stunden });
    },
    [updatePosition],
  );

  const handleSave = useCallback(async () => {
    if (!eintrag) return;

    setSaving(true);
    try {
      const gesamtstunden = computeGesamtstunden(positionen);
      await updateZeiteintrag(eintrag.id, {
        baustelleId,
        positionen,
        gesamtstunden,
      });
      navigate(-1);
    } catch {
      setError('Fehler beim Speichern.');
    } finally {
      setSaving(false);
    }
  }, [eintrag, positionen, baustelleId, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <div className="mx-auto size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (error && !eintrag) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-4">
        <p className="text-lg text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Zurueck
        </Button>
      </div>
    );
  }

  if (!eintrag) return null;

  return (
    <div className="flex min-h-full flex-col pb-6">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border p-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex size-10 items-center justify-center rounded-lg hover:bg-muted"
          aria-label="Zurueck"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Eintrag bearbeiten</h1>
          <p className="text-sm text-muted-foreground">
            {formatGermanDate(eintrag.datum)}
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-4 p-4">
        {error && (
          <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Baustelle */}
        <section>
          <label className="mb-1 block text-sm font-medium text-muted-foreground">
            Baustelle
          </label>
          <select
            value={baustelleId}
            onChange={(e) => setBaustelleId(e.target.value)}
            className="h-14 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground"
          >
            {baustellen.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
            {!baustellen.find((b) => b.id === baustelleId) && (
              <option value={baustelleId}>
                {baustelleMap.get(baustelleId) ?? baustelleId}
              </option>
            )}
          </select>
        </section>

        {/* Positionen */}
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">
            Taetigkeiten & Materialien
          </h2>

          <div className="flex flex-col gap-3">
            {positionen.map((pos, i) => {
              if (pos.typ === 'taetigkeit') {
                const t = pos as TaetigkeitPosition;
                const isPause = t.beschreibung.toLowerCase() === 'pause';
                return (
                  <div
                    key={i}
                    className={`rounded-xl border p-3 ${
                      isPause ? 'border-red-200 bg-red-50' : 'border-border bg-card'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        {isPause ? 'Pause' : `Taetigkeit ${i + 1}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => removePosition(i)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>

                    {!isPause && (
                      <>
                        <div className="mb-2 grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-muted-foreground">Von</label>
                            <input
                              type="time"
                              value={t.von}
                              onChange={(e) =>
                                recalcStunden(i, e.target.value, t.bis)
                              }
                              className="h-12 w-full rounded-lg border border-input bg-background px-2 text-center text-lg font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Bis</label>
                            <input
                              type="time"
                              value={t.bis}
                              onChange={(e) =>
                                recalcStunden(i, t.von, e.target.value)
                              }
                              className="h-12 w-full rounded-lg border border-input bg-background px-2 text-center text-lg font-bold"
                            />
                          </div>
                        </div>

                        <input
                          type="text"
                          value={t.beschreibung}
                          onChange={(e) =>
                            updatePosition(i, { beschreibung: e.target.value })
                          }
                          placeholder="Beschreibung..."
                          className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base"
                        />

                        <p className="mt-1 text-right text-sm font-medium text-accent">
                          {t.stunden.toFixed(1).replace('.', ',')} h
                        </p>
                      </>
                    )}

                    {isPause && (
                      <p className="text-base font-medium text-red-600">
                        {Math.abs(t.stunden).toFixed(1).replace('.', ',')} h
                        abgezogen
                      </p>
                    )}
                  </div>
                );
              }

              // Material
              const m = pos as MaterialPosition;
              return (
                <div
                  key={i}
                  className="ml-4 rounded-xl border border-border bg-muted/50 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Material
                    </span>
                    <button
                      type="button"
                      onClick={() => removePosition(i)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={m.bezeichnung}
                    onChange={(e) =>
                      updateMaterial(i, { bezeichnung: e.target.value })
                    }
                    placeholder="Bezeichnung..."
                    className="mb-2 h-12 w-full rounded-lg border border-input bg-background px-3 text-base"
                  />

                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={m.menge ?? ''}
                      onChange={(e) =>
                        updateMaterial(i, {
                          menge:
                            e.target.value === ''
                              ? null
                              : parseFloat(e.target.value) || null,
                        })
                      }
                      placeholder="Menge"
                      className="h-10 w-20 rounded-lg border border-input bg-background px-2 text-center text-base"
                    />
                    <div className="flex flex-1 gap-1">
                      {EINHEITEN.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => updateMaterial(i, { einheit: e })}
                          className={`flex-1 rounded-lg border py-1 text-sm font-medium ${
                            m.einheit === e
                              ? 'border-accent bg-accent text-white'
                              : 'border-border text-foreground'
                          }`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add buttons */}
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              className="min-h-[48px] flex-1 text-base"
              onClick={addTaetigkeit}
            >
              <Plus className="mr-1 size-4" />
              Taetigkeit
            </Button>
            <Button
              variant="outline"
              className="min-h-[48px] flex-1 text-base"
              onClick={addMaterial}
            >
              <Plus className="mr-1 size-4" />
              Material
            </Button>
          </div>
        </section>

        {/* Summary */}
        <section className="rounded-xl border border-border bg-card p-4">
          <p className="text-center text-lg font-bold text-foreground">
            Gesamt: {computeGesamtstunden(positionen).toFixed(1).replace('.', ',')} h
          </p>
        </section>

        {/* Save */}
        <Button
          className="h-14 w-full rounded-xl bg-accent text-lg font-bold text-accent-foreground hover:bg-accent/90"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Wird gespeichert...' : 'Aenderungen speichern'}
        </Button>
      </div>
    </div>
  );
}
