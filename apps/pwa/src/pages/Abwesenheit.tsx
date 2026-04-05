import { useCallback, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { createAbwesenheit } from '@/lib/firestore';
import type { AbwesenheitArt } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LocationState {
  art?: AbwesenheitArt;
  datum?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Abwesenheit() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mitarbeiter } = useAuth();

  const state = (location.state ?? {}) as LocationState;

  const [datum, setDatum] = useState(state.datum ?? todayString());
  const [art, setArt] = useState<AbwesenheitArt>(state.art ?? 'urlaub');
  const [ganzerTag, setGanzerTag] = useState(true);
  const [notiz, setNotiz] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    if (!mitarbeiter) return;

    setSaving(true);
    setError(null);

    try {
      await createAbwesenheit({
        mitarbeiterId: mitarbeiter.uid,
        datum,
        art,
        ganzerTag,
        stunden: ganzerTag ? 8 : 4,
        notiz,
      });
      navigate('/');
    } catch {
      setError('Fehler beim Speichern. Bitte erneut versuchen.');
    } finally {
      setSaving(false);
    }
  }, [mitarbeiter, datum, art, ganzerTag, notiz, navigate]);

  const artOptions: { value: AbwesenheitArt; label: string; classes: string; selectedClasses: string }[] = [
    {
      value: 'urlaub',
      label: 'Urlaub',
      classes: 'bg-[#3b82f6] text-white',
      selectedClasses: 'bg-[#3b82f6] text-white ring-2 ring-[#3b82f6] ring-offset-2 ring-offset-background',
    },
    {
      value: 'krank',
      label: 'Krank',
      classes: 'bg-[#f59e0b] text-white',
      selectedClasses: 'bg-[#f59e0b] text-white ring-2 ring-[#f59e0b] ring-offset-2 ring-offset-background',
    },
    {
      value: 'sonstiges',
      label: 'Sonstiges',
      classes: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      selectedClasses: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 ring-2 ring-gray-400 ring-offset-2 ring-offset-background',
    },
  ];

  return (
    <div className="flex min-h-full flex-col p-4 pb-24">
      {/* Header */}
      <header className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex size-12 items-center justify-center rounded-xl transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Zurueck"
        >
          <ArrowLeft className="size-6" />
        </button>
        <h1 className="text-xl font-bold text-foreground">
          Abwesenheit erfassen
        </h1>
      </header>

      {/* Date */}
      <section className="mb-6">
        <label
          htmlFor="abwesenheit-datum"
          className="mb-2 block text-sm font-medium text-muted-foreground"
        >
          Datum
        </label>
        <input
          id="abwesenheit-datum"
          type="date"
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
          className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </section>

      {/* Type selector */}
      <section className="mb-6">
        <p className="mb-2 text-sm font-medium text-muted-foreground">Art</p>
        <div className="grid grid-cols-3 gap-3">
          {artOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setArt(option.value)}
              className={`flex h-20 items-center justify-center rounded-xl text-base font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                art === option.value ? option.selectedClasses : option.classes
              }`}
              aria-pressed={art === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {/* Ganzer/Halber Tag */}
      <section className="mb-6">
        <p className="mb-2 text-sm font-medium text-muted-foreground">Dauer</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setGanzerTag(true)}
            className={`flex h-14 items-center justify-center rounded-xl border text-base font-semibold transition-all ${
              ganzerTag
                ? 'border-accent bg-accent text-white'
                : 'border-border bg-card text-foreground'
            }`}
            aria-pressed={ganzerTag}
          >
            Ganzer Tag
          </button>
          <button
            type="button"
            onClick={() => setGanzerTag(false)}
            className={`flex h-14 items-center justify-center rounded-xl border text-base font-semibold transition-all ${
              !ganzerTag
                ? 'border-accent bg-accent text-white'
                : 'border-border bg-card text-foreground'
            }`}
            aria-pressed={!ganzerTag}
          >
            Halber Tag
          </button>
        </div>
      </section>

      {/* Note */}
      <section className="mb-6">
        <label
          htmlFor="abwesenheit-notiz"
          className="mb-2 block text-sm font-medium text-muted-foreground"
        >
          Notiz (optional)
        </label>
        <textarea
          id="abwesenheit-notiz"
          value={notiz}
          onChange={(e) => setNotiz(e.target.value)}
          rows={3}
          placeholder="Optionale Bemerkung..."
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </section>

      {/* Error */}
      {error && (
        <p className="mb-4 text-center text-sm text-[#dc2626]" role="alert">
          {error}
        </p>
      )}

      {/* Save */}
      <Button
        className="h-14 w-full rounded-xl bg-accent text-lg font-bold text-accent-foreground hover:bg-accent/90 active:bg-accent/80"
        onClick={handleSave}
        disabled={saving || !datum}
      >
        {saving ? 'Wird gespeichert...' : 'Speichern'}
      </Button>
    </div>
  );
}
