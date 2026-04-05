import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSmartDefaults } from '@/hooks/useSmartDefaults';
import { useTaetigkeitSuggestions } from '@/hooks/useTaetigkeitSuggestions';
import { createZeiteintrag, getMyBaustellen } from '@/lib/firestore';
import type { Baustelle, TaetigkeitPosition, Position } from '@/types';
import BaustelleSelector from '@/components/form/BaustelleSelector';
import TimeInput from '@/components/form/TimeInput';
import TaetigkeitChips from '@/components/form/TaetigkeitChips';
import SpeechFreeform from '@/components/form/SpeechFreeform';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronDown, Keyboard, Mic } from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface LocationState {
  baustelleId?: string;
  baustelleName?: string;
  von?: string;
  bis?: string;
  beschreibung?: string;
  datum?: string;
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatGermanDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  }).format(d);
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function computeStunden(
  von: string,
  bis: string,
  pauseChecked: boolean,
  pauseMinutes: number,
): number {
  const vonMin = timeToMinutes(von);
  const bisMin = timeToMinutes(bis);
  let totalMin = bisMin - vonMin;
  if (pauseChecked) {
    totalMin -= pauseMinutes;
  }
  return Math.max(0, totalMin / 60);
}

function formatStunden(stunden: number): string {
  return stunden.toFixed(1).replace('.', ',');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type InputMode = 'schreiben' | 'sprechen';

export default function SuperEasy() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mitarbeiter } = useAuth();
  const { defaults, loading: defaultsLoading } = useSmartDefaults();

  const state = (location.state ?? {}) as LocationState;

  const [mode, setMode] = useState<InputMode>('schreiben');
  const [baustellen, setBaustellen] = useState<Baustelle[]>([]);

  // Form state (Schreiben mode)
  const [baustelleId, setBaustelleId] = useState<string | null>(
    state.baustelleId ?? null,
  );
  const [baustelleName, setBaustelleName] = useState<string | null>(
    state.baustelleName ?? null,
  );
  const [von, setVon] = useState(state.von ?? '07:00');
  const [bis, setBis] = useState(state.bis ?? '16:00');
  const [pauseChecked, setPauseChecked] = useState(true);
  const [pauseMinutes, setPauseMinutes] = useState(30);
  const [beschreibung, setBeschreibung] = useState(state.beschreibung ?? '');
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [defaultsApplied, setDefaultsApplied] = useState(false);

  const datum = state.datum ?? todayString();

  // Load baustellen for speech wizard
  useEffect(() => {
    if (!mitarbeiter) return;
    let cancelled = false;
    getMyBaustellen(mitarbeiter.uid).then(list => {
      if (!cancelled) setBaustellen(list);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [mitarbeiter]);

  // Apply smart defaults once loaded
  useEffect(() => {
    if (defaultsApplied || defaultsLoading || !defaults) return;

    if (!state.baustelleId && defaults.baustelleId) {
      setBaustelleId(defaults.baustelleId);
      setBaustelleName(defaults.baustelleName ?? null);
    }
    if (!state.von) {
      setVon(defaults.von);
    }
    if (!state.bis) {
      setBis(defaults.bis);
    }
    if (!state.beschreibung && defaults.beschreibung) {
      setBeschreibung(defaults.beschreibung);
    }

    if (mitarbeiter?.einstellungen) {
      setPauseChecked(mitarbeiter.einstellungen.pauseAbziehen);
      const [ph, pm] = mitarbeiter.einstellungen.pauseDauer
        .split(':')
        .map(Number);
      setPauseMinutes(ph * 60 + pm);
    }

    setDefaultsApplied(true);
  }, [defaults, defaultsLoading, defaultsApplied, state, mitarbeiter]);

  const { suggestions } = useTaetigkeitSuggestions(baustelleId);

  const gesamtstunden = useMemo(
    () => computeStunden(von, bis, pauseChecked, pauseMinutes),
    [von, bis, pauseChecked, pauseMinutes],
  );

  const handleBaustelleSelect = useCallback((b: Baustelle) => {
    setBaustelleId(b.id);
    setBaustelleName(b.name);
    setSelectorOpen(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!mitarbeiter || !baustelleId) return;

    setSubmitting(true);
    try {
      const positionen: Position[] = [];

      const mainPosition: TaetigkeitPosition = {
        typ: 'taetigkeit',
        von,
        bis,
        beschreibung,
        stunden: computeStunden(von, bis, false, 0),
      };
      positionen.push(mainPosition);

      if (pauseChecked && pauseMinutes > 0) {
        const pausePosition: TaetigkeitPosition = {
          typ: 'taetigkeit',
          von: '',
          bis: '',
          beschreibung: 'Pause',
          stunden: -(pauseMinutes / 60),
        };
        positionen.push(pausePosition);
      }

      await createZeiteintrag({
        mitarbeiterId: mitarbeiter.uid,
        baustelleId,
        datum,
        modus: 'supereasy',
        gesamtstunden,
        positionen,
        status: 'entwurf',
        synchronisiert: false,
      });

      navigate('/');
    } catch {
      // Handle error silently for now
    } finally {
      setSubmitting(false);
    }
  }, [
    mitarbeiter, baustelleId, von, bis, beschreibung,
    pauseChecked, pauseMinutes, gesamtstunden, datum, navigate,
  ]);

  // Speech freeform save handler (multiple entries)
  const handleSpeechSave = useCallback(async (entries: {
    baustelleId: string;
    von: string;
    bis: string;
    positionen: Position[];
    gesamtstunden: number;
  }[]) => {
    if (!mitarbeiter) return;

    setSubmitting(true);
    try {
      for (const data of entries) {
        await createZeiteintrag({
          mitarbeiterId: mitarbeiter.uid,
          baustelleId: data.baustelleId,
          datum,
          modus: 'supereasy',
          gesamtstunden: data.gesamtstunden,
          positionen: data.positionen,
          status: 'entwurf',
          synchronisiert: false,
        });
      }
      navigate('/');
    } catch {
      // Handle error silently
    } finally {
      setSubmitting(false);
    }
  }, [mitarbeiter, datum, navigate]);

  const canSave = baustelleId !== null && gesamtstunden > 0;

  if (defaultsLoading) {
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
    <div className="flex min-h-full flex-col pb-6">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border p-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex size-10 items-center justify-center rounded-lg transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Zurueck"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">SuperEasy</h1>
          <p className="text-sm text-muted-foreground">
            {formatGermanDate(datum)}
          </p>
        </div>
      </header>

      {/* Mode Toggle */}
      <div className="flex gap-1 border-b border-border bg-muted/50 p-2">
        <button
          type="button"
          onClick={() => setMode('schreiben')}
          className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-lg text-base font-medium transition-colors ${
            mode === 'schreiben'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground'
          }`}
        >
          <Keyboard className="size-4" />
          Schreiben
        </button>
        <button
          type="button"
          onClick={() => setMode('sprechen')}
          className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-lg text-base font-medium transition-colors ${
            mode === 'sprechen'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground'
          }`}
        >
          <Mic className="size-4" />
          Sprechen
        </button>
      </div>

      {/* Sprechen Mode */}
      {mode === 'sprechen' && (
        <div className="flex flex-1 flex-col p-4">
          <SpeechFreeform
            baustellen={baustellen}
            defaultBaustelleId={baustelleId}
            defaultBaustelleName={baustelleName}
            defaultVon={von}
            defaultBis={bis}
            datum={datum}
            pauseMinutes={pauseMinutes}
            taetigkeitenKatalog={[]}
            onSave={handleSpeechSave}
            onCancel={() => setMode('schreiben')}
          />
        </div>
      )}

      {/* Schreiben Mode */}
      {mode === 'schreiben' && (
        <div className="flex flex-col gap-5 p-4">
          {/* Baustelle Selector Chip */}
          <section>
            <span className="mb-1 block text-sm font-medium text-muted-foreground">
              Baustelle
            </span>
            <button
              type="button"
              onClick={() => setSelectorOpen(true)}
              className="flex h-14 w-full items-center justify-between rounded-xl border border-border bg-card px-4 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                className={`text-base font-medium ${
                  baustelleName ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {baustelleName ?? 'Baustelle auswaehlen...'}
              </span>
              <ChevronDown className="size-5 text-muted-foreground" />
            </button>
          </section>

          {/* Time Inputs */}
          <section className="grid grid-cols-2 gap-4">
            <TimeInput label="Von" value={von} onChange={setVon} />
            <TimeInput label="Bis" value={bis} onChange={setBis} />
          </section>

          {/* Pause Row */}
          <section className="flex items-center gap-4">
            <label className="flex min-h-[48px] items-center gap-3">
              <input
                type="checkbox"
                checked={pauseChecked}
                onChange={(e) => setPauseChecked(e.target.checked)}
                className="size-5 rounded border-input accent-accent"
              />
              <span className="text-base text-foreground">Pause abziehen</span>
            </label>

            {pauseChecked && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPauseMinutes(30)}
                  className={`min-h-[40px] rounded-full border px-4 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    pauseMinutes === 30
                      ? 'border-accent bg-accent text-white'
                      : 'border-border bg-card text-foreground hover:bg-muted'
                  }`}
                >
                  0:30
                </button>
                <button
                  type="button"
                  onClick={() => setPauseMinutes(60)}
                  className={`min-h-[40px] rounded-full border px-4 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    pauseMinutes === 60
                      ? 'border-accent bg-accent text-white'
                      : 'border-border bg-card text-foreground hover:bg-muted'
                  }`}
                >
                  1:00
                </button>
              </div>
            )}
          </section>

          {/* Taetigkeit */}
          <section>
            <span className="mb-2 block text-sm font-medium text-muted-foreground">
              Taetigkeit
            </span>
            <TaetigkeitChips
              suggestions={suggestions}
              value={beschreibung}
              onChange={setBeschreibung}
            />
          </section>

          {/* Summary */}
          <section className="rounded-xl border border-border bg-card p-4">
            <p className="text-center text-lg font-bold text-foreground">
              Gesamtstunden: {formatStunden(gesamtstunden)} h
            </p>
          </section>

          {/* Save Button */}
          <Button
            className="h-14 w-full rounded-xl bg-accent text-lg font-bold text-accent-foreground hover:bg-accent/90 active:bg-accent/80"
            onClick={handleSave}
            disabled={!canSave || submitting}
          >
            {submitting ? 'Wird gespeichert...' : 'Speichern'}
          </Button>
        </div>
      )}

      {/* Baustelle Selector Overlay (Schreiben mode only) */}
      {mode === 'schreiben' && (
        <BaustelleSelector
          open={selectorOpen}
          onSelect={handleBaustelleSelect}
          onClose={() => setSelectorOpen(false)}
          selectedId={baustelleId ?? undefined}
        />
      )}
    </div>
  );
}
