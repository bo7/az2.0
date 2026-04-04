import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getMyBaustellen, updateMitarbeiter } from '@/lib/firestore';
import { auth } from '@/lib/firebase';
import {
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import type { Baustelle, MitarbeiterEinstellungen } from '@/types';
import { Button } from '@/components/ui/button';
import { Check, LogOut } from 'lucide-react';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Profil() {
  const navigate = useNavigate();
  const { mitarbeiter, user } = useAuth();

  // Password change
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMessage, setPwMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  // Baustellen for standard selection
  const [baustellen, setBaustellen] = useState<Baustelle[]>([]);
  const [selectedBaustelleId, setSelectedBaustelleId] = useState<string | null>(
    null,
  );

  // Settings
  const [pauseAbziehen, setPauseAbziehen] = useState(true);
  const [pauseDauer, setPauseDauer] = useState('00:30');
  const [eingabemodus, setEingabemodus] = useState<'supereasy' | 'standard'>(
    'supereasy',
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Initialize from mitarbeiter
  useEffect(() => {
    if (!mitarbeiter) return;
    setSelectedBaustelleId(mitarbeiter.standardBaustelleId);
    setPauseAbziehen(mitarbeiter.einstellungen.pauseAbziehen);
    setPauseDauer(mitarbeiter.einstellungen.pauseDauer);
  }, [mitarbeiter]);

  // Load baustellen
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
    return () => {
      cancelled = true;
    };
  }, [mitarbeiter]);

  // Password change handler
  const handlePasswordChange = useCallback(async () => {
    if (!user || !user.email) return;

    if (newPw !== confirmPw) {
      setPwMessage({ type: 'error', text: 'Passwoerter stimmen nicht ueberein.' });
      return;
    }
    if (newPw.length < 6) {
      setPwMessage({
        type: 'error',
        text: 'Neues Passwort muss mindestens 6 Zeichen haben.',
      });
      return;
    }

    setPwLoading(true);
    setPwMessage(null);

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPw);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPw);
      setPwMessage({ type: 'success', text: 'Passwort erfolgreich geaendert.' });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch {
      setPwMessage({
        type: 'error',
        text: 'Passwort konnte nicht geaendert werden. Bitte aktuelles Passwort pruefen.',
      });
    } finally {
      setPwLoading(false);
    }
  }, [user, currentPw, newPw, confirmPw]);

  // Save settings
  const handleSave = useCallback(async () => {
    if (!mitarbeiter) return;

    setSaving(true);
    setSaveMessage(null);

    try {
      const einstellungen: MitarbeiterEinstellungen = {
        pauseAbziehen,
        pauseDauer,
        wochenstundenSoll: mitarbeiter.einstellungen.wochenstundenSoll,
      };

      await updateMitarbeiter(mitarbeiter.uid, {
        einstellungen,
        standardBaustelleId: selectedBaustelleId,
      });
      setSaveMessage('Einstellungen gespeichert.');
    } catch {
      setSaveMessage('Fehler beim Speichern.');
    } finally {
      setSaving(false);
    }
  }, [mitarbeiter, pauseAbziehen, pauseDauer, selectedBaustelleId]);

  // Sign out
  const handleSignOut = useCallback(async () => {
    await signOut(auth);
    navigate('/login');
  }, [navigate]);

  const settingsChanged = useMemo(() => {
    if (!mitarbeiter) return false;
    return (
      pauseAbziehen !== mitarbeiter.einstellungen.pauseAbziehen ||
      pauseDauer !== mitarbeiter.einstellungen.pauseDauer ||
      selectedBaustelleId !== mitarbeiter.standardBaustelleId
    );
  }, [mitarbeiter, pauseAbziehen, pauseDauer, selectedBaustelleId]);

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
    <div className="flex min-h-full flex-col gap-6 p-4 pb-24">
      <h1 className="text-xl font-bold text-foreground">Profil</h1>

      {/* User info */}
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-foreground">
          Persoenliche Daten
        </h2>
        <div className="space-y-2">
          <div>
            <span className="text-sm text-muted-foreground">Name</span>
            <p className="text-base font-medium text-foreground">
              {mitarbeiter?.name ?? '-'}
            </p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">E-Mail</span>
            <p className="text-base font-medium text-foreground">
              {mitarbeiter?.email ?? '-'}
            </p>
          </div>
        </div>
      </section>

      {/* Password change */}
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-foreground">
          Passwort aendern
        </h2>
        <div className="space-y-3">
          <input
            type="password"
            placeholder="Aktuelles Passwort"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            autoComplete="current-password"
            aria-label="Aktuelles Passwort"
          />
          <input
            type="password"
            placeholder="Neues Passwort"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            autoComplete="new-password"
            aria-label="Neues Passwort"
          />
          <input
            type="password"
            placeholder="Neues Passwort bestaetigen"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            autoComplete="new-password"
            aria-label="Neues Passwort bestaetigen"
          />
          {pwMessage && (
            <p
              className={`text-sm ${pwMessage.type === 'success' ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}
              role="alert"
            >
              {pwMessage.text}
            </p>
          )}
          <Button
            className="h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-foreground hover:bg-accent/90 active:bg-accent/80"
            onClick={handlePasswordChange}
            disabled={pwLoading || !currentPw || !newPw || !confirmPw}
          >
            {pwLoading ? 'Wird geaendert...' : 'Passwort aendern'}
          </Button>
        </div>
      </section>

      {/* Standard-Baustelle */}
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-foreground">
          Standard-Baustelle
        </h2>
        <div className="flex flex-col gap-2">
          {baustellen.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() =>
                setSelectedBaustelleId(
                  selectedBaustelleId === b.id ? null : b.id,
                )
              }
              className={`flex h-12 items-center justify-between rounded-xl border px-4 text-left text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                selectedBaustelleId === b.id
                  ? 'border-accent bg-accent/10 font-semibold text-foreground'
                  : 'border-border bg-background text-foreground'
              }`}
              aria-pressed={selectedBaustelleId === b.id}
            >
              <span className="truncate">{b.name}</span>
              {selectedBaustelleId === b.id && (
                <Check className="ml-2 size-5 shrink-0 text-accent" />
              )}
            </button>
          ))}
          {baustellen.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Keine Baustellen verfuegbar.
            </p>
          )}
        </div>
      </section>

      {/* Pause settings */}
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-foreground">
          Pause
        </h2>
        <label className="flex h-12 items-center gap-3">
          <input
            type="checkbox"
            checked={pauseAbziehen}
            onChange={(e) => setPauseAbziehen(e.target.checked)}
            className="size-5 rounded border-input accent-accent"
          />
          <span className="text-base text-foreground">Pause abziehen</span>
        </label>
        {pauseAbziehen && (
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={() => setPauseDauer('00:30')}
              className={`h-12 flex-1 rounded-xl border text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                pauseDauer === '00:30'
                  ? 'border-accent bg-accent text-accent-foreground'
                  : 'border-border bg-background text-foreground'
              }`}
            >
              0:30
            </button>
            <button
              type="button"
              onClick={() => setPauseDauer('01:00')}
              className={`h-12 flex-1 rounded-xl border text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                pauseDauer === '01:00'
                  ? 'border-accent bg-accent text-accent-foreground'
                  : 'border-border bg-background text-foreground'
              }`}
            >
              1:00
            </button>
          </div>
        )}
      </section>

      {/* Eingabemodus */}
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-foreground">
          Eingabemodus
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setEingabemodus('supereasy')}
            className={`flex h-20 flex-col items-center justify-center rounded-xl border text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              eingabemodus === 'supereasy'
                ? 'border-accent bg-accent text-accent-foreground ring-2 ring-accent'
                : 'border-border bg-background text-foreground'
            }`}
            aria-pressed={eingabemodus === 'supereasy'}
          >
            SuperEasy
          </button>
          <button
            type="button"
            onClick={() => setEingabemodus('standard')}
            className={`flex h-20 flex-col items-center justify-center rounded-xl border text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              eingabemodus === 'standard'
                ? 'border-accent bg-accent text-accent-foreground ring-2 ring-accent'
                : 'border-border bg-background text-foreground'
            }`}
            aria-pressed={eingabemodus === 'standard'}
          >
            Standard
          </button>
        </div>
      </section>

      {/* Save button */}
      <Button
        className="h-14 w-full rounded-xl bg-accent text-lg font-bold text-accent-foreground hover:bg-accent/90 active:bg-accent/80"
        onClick={handleSave}
        disabled={saving || !settingsChanged}
      >
        {saving ? 'Wird gespeichert...' : 'Einstellungen speichern'}
      </Button>
      {saveMessage && (
        <p
          className={`text-center text-sm ${saveMessage.includes('Fehler') ? 'text-[#dc2626]' : 'text-[#16a34a]'}`}
          role="alert"
        >
          {saveMessage}
        </p>
      )}

      {/* Sign out */}
      <Button
        variant="outline"
        className="h-14 w-full rounded-xl border-[#dc2626] text-lg font-semibold text-[#dc2626] hover:bg-[#dc2626]/10 active:bg-[#dc2626]/20"
        onClick={handleSignOut}
      >
        <LogOut className="mr-2 size-5" />
        Abmelden
      </Button>
    </div>
  );
}
