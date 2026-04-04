import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import Dashboard from "@/pages/Dashboard";
import Mitarbeiter from "@/pages/Mitarbeiter";
import Baustellen from "@/pages/Baustellen";
import Auftraggeber from "@/pages/Auftraggeber";
import Zeiteintraege from "@/pages/Zeiteintraege";
import Abwesenheiten from "@/pages/Abwesenheiten";
import Auswertung from "@/pages/Auswertung";
import Export from "@/pages/Export";
import Einstellungen from "@/pages/Einstellungen";

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/mitarbeiter" element={<Mitarbeiter />} />
            <Route path="/baustellen" element={<Baustellen />} />
            <Route path="/auftraggeber" element={<Auftraggeber />} />
            <Route path="/zeiteintraege" element={<Zeiteintraege />} />
            <Route path="/abwesenheiten" element={<Abwesenheiten />} />
            <Route path="/auswertung" element={<Auswertung />} />
            <Route path="/export" element={<Export />} />
            <Route path="/einstellungen" element={<Einstellungen />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
