import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import Login from '@/pages/Login';
import Heute from '@/pages/Heute';
import SuperEasy from '@/pages/SuperEasy';
import Standard from '@/pages/Standard';
import Kalender from '@/pages/Kalender';
import Baustellen from '@/pages/Baustellen';
import Profil from '@/pages/Profil';
import Abwesenheit from '@/pages/Abwesenheit';

function ProtectedPage({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedPage><Heute /></ProtectedPage>} />
          <Route path="/supereasy" element={<ProtectedPage><SuperEasy /></ProtectedPage>} />
          <Route path="/standard" element={<ProtectedPage><Standard /></ProtectedPage>} />
          <Route path="/kalender" element={<ProtectedPage><Kalender /></ProtectedPage>} />
          <Route path="/baustellen" element={<ProtectedPage><Baustellen /></ProtectedPage>} />
          <Route path="/profil" element={<ProtectedPage><Profil /></ProtectedPage>} />
          <Route path="/abwesenheit" element={<ProtectedPage><Abwesenheit /></ProtectedPage>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
