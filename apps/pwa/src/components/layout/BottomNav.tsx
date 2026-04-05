import { NavLink } from 'react-router-dom';
import { Home, Calendar, User } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Heute', icon: Home },
  { to: '/kalender', label: 'Kalender', icon: Calendar },
  { to: '/profil', label: 'Profil', icon: User },
] as const;

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex h-14 items-center border-t border-border bg-card">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
              isActive ? 'text-accent' : 'text-muted-foreground'
            }`
          }
        >
          <Icon className="size-6" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
