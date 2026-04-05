import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSmartDefaults } from '@/hooks/useSmartDefaults';
import { createZeiteintrag, getMyBaustellen } from '@/lib/firestore';
import type { Baustelle, Position } from '@/types';
import SpeechFreeform from '@/components/form/SpeechFreeform';
import { ArrowLeft } from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface LocationState {
  baustelleId?: string;
  baustelleName?: string;
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SuperEasy() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mitarbeiter } = useAuth();
  const { defaults, loading: defaultsLoading } = useSmartDefaults();

  const state = (location.state ?? {}) as LocationState;

  const [baustellen, setBaustellen] = useState<Baustelle[]>([]);
  const [baustelleId, setBaustelleId] = useState<string | null>(
    state.baustelleId ?? null,
  );
  const [baustelleName, setBaustelleName] = useState<string | null>(
    state.baustelleName ?? null,
  );
  const [von, setVon] = useState('07:00');
  const [bis, setBis] = useState('16:00');
  const [pauseMinutes, setPauseMinutes] = useState(30);
  const [defaultsApplied, setDefaultsApplied] = useState(false);

  const datum = state.datum ?? todayString();

  // Load baustellen
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
    if (defaults.von) setVon(defaults.von);
    if (defaults.bis) setBis(defaults.bis);

    if (mitarbeiter?.einstellungen) {
      const [ph, pm] = mitarbeiter.einstellungen.pauseDauer
        .split(':')
        .map(Number);
      setPauseMinutes(ph * 60 + pm);
    }

    setDefaultsApplied(true);
  }, [defaults, defaultsLoading, defaultsApplied, state, mitarbeiter]);

  // Save handler (multiple entries from chat)
  const handleSave = useCallback(async (entries: {
    baustelleId: string;
    von: string;
    bis: string;
    positionen: Position[];
    gesamtstunden: number;
  }[]) => {
    if (!mitarbeiter) return;

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
    }
  }, [mitarbeiter, datum, navigate]);

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

      <div className="flex flex-1 flex-col p-4">
        {/* Baustellen-Chips */}
        <div className="mb-3 flex flex-wrap gap-2">
          {baustellen.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                setBaustelleId(b.id);
                setBaustelleName(b.name);
              }}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                baustelleId === b.id
                  ? 'border-accent bg-accent text-white'
                  : 'border-border bg-card text-muted-foreground'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>

        <SpeechFreeform
          baustellen={baustellen}
          defaultBaustelleId={baustelleId}
          defaultBaustelleName={baustelleName}
          defaultVon={von}
          defaultBis={bis}
          datum={datum}
          pauseMinutes={pauseMinutes}
          taetigkeitenKatalog={[]}
          autoStart
          onSave={handleSave}
          onCancel={() => navigate('/')}
        />
      </div>
    </div>
  );
}
