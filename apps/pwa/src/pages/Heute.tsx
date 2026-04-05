import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSmartDefaults } from '@/hooks/useSmartDefaults';
import { useCloneEntry } from '@/hooks/useCloneEntry';
import {
  getZeiteintraegeForDate,
  getMyBaustellen,
  createZeiteintrag,
  getGlobaleEinstellungen,
} from '@/lib/firestore';
import type { Zeiteintrag, Baustelle, TaetigkeitPosition } from '@/types';
import { Button } from '@/components/ui/button';
import EntryCard from '@/components/heute/EntryCard';
import PasstSoCard from '@/components/heute/PasstSoCard';
import DaySummary from '@/components/heute/DaySummary';
import { Plus } from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatGermanDate(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function getISOWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Heute() {
  const navigate = useNavigate();
  const { user, mitarbeiter } = useAuth();
  const { defaults, loading: defaultsLoading } = useSmartDefaults();
  const { cloneOption, cloneEntries, loading: cloneLoading } = useCloneEntry();

  const [entries, setEntries] = useState<Zeiteintrag[]>([]);
  const [baustellen, setBaustellen] = useState<Baustelle[]>([]);
  const [sollStunden, setSollStunden] = useState(8);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const today = new Date();
  const datum = todayString();

  // Load today's entries and baustellen
  useEffect(() => {
    if (!mitarbeiter) return;

    let cancelled = false;

    async function load() {
      try {
        const [todayEntries, baustellenList, einstellungen] = await Promise.all([
          getZeiteintraegeForDate(mitarbeiter!.uid, datum),
          getMyBaustellen(mitarbeiter!.uid),
          getGlobaleEinstellungen(),
        ]);

        if (cancelled) return;

        setEntries(todayEntries);
        setBaustellen(baustellenList);

        if (einstellungen) {
          const dailySoll =
            einstellungen.wochenstundenSoll /
            (einstellungen.arbeitstageProWoche.length || 5);
          setSollStunden(dailySoll);
        }
      } catch {
        // Silently handle errors for now
      } finally {
        if (!cancelled) setLoadingEntries(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [mitarbeiter, datum]);

  const baustelleMap = new Map(baustellen.map((b) => [b.id, b.name]));

  const totalStunden = entries.reduce((sum, e) => sum + e.gesamtstunden, 0);

  const loading = loadingEntries || defaultsLoading || cloneLoading;

  const hasEntries = entries.length > 0;
  const hasHistory = defaults !== null && defaults.baustelleId !== null;

  const pauseDauer =
    mitarbeiter?.einstellungen.pauseDauer ?? '00:30';

  // "Passt so" handler: create entry from smart defaults
  const handlePasstSo = useCallback(async () => {
    if (!defaults || !defaults.baustelleId || !mitarbeiter) return;

    setSubmitting(true);
    try {
      const [vonH, vonM] = defaults.von.split(':').map(Number);
      const [bisH, bisM] = defaults.bis.split(':').map(Number);
      const [pauseH, pauseM] = pauseDauer.split(':').map(Number);
      const totalMinutes =
        bisH * 60 + bisM - (vonH * 60 + vonM) - (pauseH * 60 + pauseM);
      const stunden = totalMinutes / 60;

      const positionen: TaetigkeitPosition[] = [
        {
          typ: 'taetigkeit',
          von: defaults.von,
          bis: defaults.bis,
          beschreibung: defaults.beschreibung ?? '',
          stunden,
        },
      ];

      await createZeiteintrag({
        mitarbeiterId: mitarbeiter.uid,
        baustelleId: defaults.baustelleId,
        datum,
        modus: 'supereasy',
        gesamtstunden: stunden,
        positionen,
        status: 'entwurf',
        synchronisiert: false,
      });

      // Reload entries
      const updated = await getZeiteintraegeForDate(mitarbeiter.uid, datum);
      setEntries(updated);
    } catch {
      // Handle error silently for now
    } finally {
      setSubmitting(false);
    }
  }, [defaults, mitarbeiter, datum, pauseDauer]);

  // Clone handler
  const handleClone = useCallback(async () => {
    if (!mitarbeiter) return;

    setSubmitting(true);
    try {
      await cloneEntries(datum);
      const updated = await getZeiteintraegeForDate(mitarbeiter.uid, datum);
      setEntries(updated);
    } catch {
      // Handle error silently for now
    } finally {
      setSubmitting(false);
    }
  }, [cloneEntries, mitarbeiter, datum]);

  // Loading state
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
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-xl font-bold text-foreground">
          {formatGermanDate(today)}
        </h1>
        <p className="text-base text-muted-foreground">
          KW {getISOWeekNumber(today)}
        </p>
        <div className="mt-3 flex items-center gap-3">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt=""
              referrerPolicy="no-referrer"
              className="size-10 rounded-full object-cover ring-2 ring-accent/30"
            />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-full bg-accent/20 text-base font-bold text-accent">
              {(mitarbeiter?.name?.[0] ?? '?').toUpperCase()}
            </div>
          )}
          <p className="text-lg text-foreground">
            Hallo {mitarbeiter?.name?.split(' ')[0] ?? 'Mitarbeiter'}
          </p>
        </div>
      </header>

      {/* State A: Has entries today */}
      {hasEntries && (
        <div className="flex flex-1 flex-col gap-3">
          {entries.map((entry) => (
            <EntryCard
              key={entry.id}
              eintrag={entry}
              baustelleName={baustelleMap.get(entry.baustelleId) ?? 'Unbekannt'}
              onClick={() => navigate(`/eintrag/${entry.id}`)}
            />
          ))}

          <div className="mt-2">
            <DaySummary stunden={totalStunden} soll={sollStunden} />
          </div>

          <div className="mt-4 flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              className="min-h-[48px] text-base text-muted-foreground"
              onClick={() =>
                navigate('/abwesenheit', { state: { art: 'urlaub', datum } })
              }
            >
              Urlaub
            </Button>
            <span className="text-muted-foreground" aria-hidden="true">|</span>
            <Button
              variant="ghost"
              className="min-h-[48px] text-base text-muted-foreground"
              onClick={() =>
                navigate('/abwesenheit', { state: { art: 'krank', datum } })
              }
            >
              Krank
            </Button>
          </div>

          {/* New entry button */}
          <div className="mt-4">
            <Button
              className="h-14 w-full rounded-xl bg-accent text-lg font-bold text-accent-foreground hover:bg-accent/90 active:bg-accent/80"
              onClick={() => navigate('/supereasy')}
            >
              <Plus className="mr-2 size-5" />
              Neuer Eintrag
            </Button>
          </div>
        </div>
      )}

      {/* State B: No entries, has history (Passt so) */}
      {!hasEntries && hasHistory && defaults && (
        <div className="flex flex-1 flex-col gap-4">
          <PasstSoCard defaults={defaults} pauseDauer={pauseDauer} />

          <Button
            className="h-16 w-full rounded-xl bg-success text-xl font-bold text-white hover:bg-success/90 active:bg-success/80"
            onClick={handlePasstSo}
            disabled={submitting}
          >
            {submitting ? 'Wird erstellt...' : 'PASST SO'}
          </Button>

          <Button
            variant="outline"
            className="min-h-[48px] w-full text-lg"
            onClick={() =>
              navigate('/supereasy', {
                state: {
                  baustelleId: defaults.baustelleId,
                  von: defaults.von,
                  bis: defaults.bis,
                  beschreibung: defaults.beschreibung,
                },
              })
            }
          >
            Anpassen
          </Button>

          {cloneOption && (
            <Button
              variant="ghost"
              className="min-h-[48px] w-full text-lg text-muted-foreground"
              onClick={handleClone}
              disabled={submitting}
            >
              {cloneOption.label}
            </Button>
          )}

          <div className="mt-2 flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              className="min-h-[48px] text-base text-muted-foreground"
              onClick={() =>
                navigate('/abwesenheit', { state: { art: 'urlaub', datum } })
              }
            >
              Urlaub
            </Button>
            <span className="text-muted-foreground" aria-hidden="true">|</span>
            <Button
              variant="ghost"
              className="min-h-[48px] text-base text-muted-foreground"
              onClick={() =>
                navigate('/abwesenheit', { state: { art: 'krank', datum } })
              }
            >
              Krank
            </Button>
          </div>
        </div>
      )}

      {/* State C: No entries, no history (new user) */}
      {!hasEntries && !hasHistory && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <p className="text-center text-lg text-muted-foreground">
            Noch keine Eintraege. Starte jetzt!
          </p>
          <Button
            className="h-14 w-full max-w-xs rounded-xl bg-accent text-xl font-bold text-accent-foreground hover:bg-accent/90 active:bg-accent/80"
            onClick={() => navigate('/supereasy')}
          >
            Neuer Eintrag
          </Button>
        </div>
      )}

      {/* Build version */}
      <p className="mt-auto pt-4 text-center text-[10px] text-muted-foreground/50">
        v{__BUILD_VERSION__}
      </p>
    </div>
  );
}
