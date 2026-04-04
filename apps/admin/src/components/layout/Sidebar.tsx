import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  Clock,
  CalendarOff,
  BarChart3,
  Download,
  Settings,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/mitarbeiter", label: "Mitarbeiter", icon: Users },
  { to: "/baustellen", label: "Baustellen", icon: Building2 },
  { to: "/auftraggeber", label: "Auftraggeber", icon: Briefcase },
  { to: "/zeiteintraege", label: "Zeiteintraege", icon: Clock },
  { to: "/abwesenheiten", label: "Abwesenheiten", icon: CalendarOff },
  { to: "/auswertung", label: "Auswertung", icon: BarChart3 },
  { to: "/export", label: "Export", icon: Download },
  { to: "/einstellungen", label: "Einstellungen", icon: Settings },
] as const;

export function Sidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <span className="text-lg font-bold tracking-tight text-sidebar-primary">
          az2.0
        </span>
        <span className="text-sm font-medium text-sidebar-foreground/70">
          Admin
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Hauptnavigation">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-6 py-4">
        <p className="text-xs text-sidebar-foreground/50">
          az2.0 Admin v0.1.0
        </p>
      </div>
    </aside>
  );
}
