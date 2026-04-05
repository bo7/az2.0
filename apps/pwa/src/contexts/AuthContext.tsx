import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { getMitarbeiter } from '@/lib/firestore';
import type { Mitarbeiter } from '@/types';

interface AuthContextValue {
  user: User | null;
  mitarbeiter: Mitarbeiter | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          let ma = await getMitarbeiter(firebaseUser.uid);

          // Auto-create mitarbeiter doc on first Google sign-in
          if (!ma) {
            const newMa = {
              name: firebaseUser.displayName ?? firebaseUser.email ?? '',
              email: firebaseUser.email ?? '',
              rolle: 'mitarbeiter' as const,
              aktiv: true,
              einstellungen: {
                bevorzugterModus: 'supereasy' as const,
                pauseAbziehen: true,
                pauseDauer: '00:30',
                standardBaustelleId: null,
              },
              erstelltAm: serverTimestamp(),
            };
            await setDoc(doc(db, 'mitarbeiter', firebaseUser.uid), newMa);
            ma = await getMitarbeiter(firebaseUser.uid);
          }

          setMitarbeiter(ma);
        } catch {
          setMitarbeiter(null);
        }
      } else {
        setMitarbeiter(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, mitarbeiter, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
