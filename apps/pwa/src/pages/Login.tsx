import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Eye, EyeOff } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export default function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/', { replace: true });
    } catch {
      setError('Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort pruefen.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Header */}
      <div className="flex flex-col items-center justify-center bg-primary px-4 py-12">
        <h1 className="text-3xl font-bold text-white">az2.0</h1>
        <p className="mt-1 text-sm text-white/80">Zeiterfassung</p>
      </div>

      {/* Login Card */}
      <div className="flex flex-1 justify-center px-4 -mt-6">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm rounded-xl bg-card p-6 shadow-lg"
        >
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          {/* E-Mail */}
          <div className="mb-4">
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              E-Mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/50"
              placeholder="name@firma.de"
            />
          </div>

          {/* Passwort */}
          <div className="mb-4">
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Passwort
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full rounded-lg border border-input bg-background px-3 pr-12 text-base text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/50"
                placeholder="Passwort eingeben"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
              >
                {showPassword ? (
                  <EyeOff className="size-5" />
                ) : (
                  <Eye className="size-5" />
                )}
              </button>
            </div>
          </div>

          {/* Angemeldet bleiben */}
          <div className="mb-6 flex items-center gap-2">
            <input
              id="rememberMe"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="size-4 rounded border-input accent-accent"
            />
            <label htmlFor="rememberMe" className="text-sm text-muted-foreground">
              Angemeldet bleiben
            </label>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={submitting}
            className="h-12 w-full bg-accent text-base font-semibold text-white hover:bg-accent/90 disabled:opacity-60"
          >
            {submitting ? 'Anmelden...' : 'Anmelden'}
          </Button>
        </form>
      </div>
    </div>
  );
}
