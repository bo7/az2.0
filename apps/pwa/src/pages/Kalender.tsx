import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  getZeiteintraege,
  getAbwesenheiten,
  getGlobaleEinstellungen,
  getMyBaustellen,
} from '@/lib/firestore';
import type { Zeiteintrag, Abwesenheit, GlobaleEinstellungen, Baustelle } from '@/types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

function formatGermanMonth(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatHours(n: number): string {
  return n.toLocaleString('de-DE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/** Returns the Monday of the ISO week that contains the given date. */
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay() || 7; // Sunday = 7
  d.setDate(d.getDate() - day + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Build a grid of weeks for the given month. Each week = 7 Date objects (Mon-Sun). */
function buildMonthGrid(year: number, month: number): Date[][] {
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  const startMonday = getMondayOfWeek(firstOfMonth);
  const endSunday = getMondayOfWeek(lastOfMonth);
  endSunday.setDate(endSunday.getDate() + 6);

  const weeks: Date[][] = [];
  const cursor = new Date(startMonday);

  while (cursor <= endSunday) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  return weeks;
}

type DayStatus = 'green' | 'orange' | 'red' | 'blue' | 'krank' | 'gray';

function getDayStatus(
  dateStr: string,
  dayOfWeek: number, // 0=Mon ... 6=Sun
  workdays: Set<string>,
  entriesByDate: Map<string, number>,
  absenceByDate: Map<string, string>,
  dailySoll: number,
): DayStatus {
  // Check absences first
  const absence = absenceByDate.get(dateStr);
  if (absence === 'urlaub') return 'blue';
  if (absence === 'krank') return 'krank';
  if (absence === 'feiertag' || absence === 'sonstiges') return 'gray';

  // Check if it's a work day
  const dayNames = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'];
  const dayName = dayNames[dayOfWeek];
  if (!workdays.has(dayName)) return 'gray';

  const hours = entriesByDate.get(dateStr);
  if (hours === undefined || hours === 0) return 'red';
  if (hours < dailySoll) return 'orange';
  return 'green';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Kalender() {
  const navigate = useNavigate();
  const { mitarbeiter } = useAuth();

  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [entries, setEntries] = useState<Zeiteintrag[]>([]);
  const [absences, setAbsences] = useState<Abwesenheit[]>([]);
  const [baustellen, setBaustellen] = useState<Baustelle[]>([]);
  const [einstellungen, setEinstellungen] = useState<GlobaleEinstellungen | null>(null);
  const [loading, setLoading] = useState(true);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const todayStr = toISO(new Date());

  const weeks = useMemo(() => buildMonthGrid(year, month), [year, month]);

  // Date range for queries: first day of first week to last day of last week
  const rangeVon = useMemo(() => toISO(weeks[0][0]), [weeks]);
  const rangeBis = useMemo(() => toISO(weeks[weeks.length - 1][6]), [weeks]);

  useEffect(() => {
    if (!mitarbeiter) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [ze, ab, ge, bs] = await Promise.all([
          getZeiteintraege(mitarbeiter!.uid, rangeVon, rangeBis),
          getAbwesenheiten(mitarbeiter!.uid, rangeVon, rangeBis),
          getGlobaleEinstellungen(),
          getMyBaustellen(mitarbeiter!.uid),
        ]);
        if (cancelled) return;
        setEntries(ze);
        setAbsences(ab);
        setEinstellungen(ge);
        setBaustellen(bs);
      } catch {
        // Silently handle
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [mitarbeiter, rangeVon, rangeBis]);

  // Build lookup maps
  const entriesByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      map.set(e.datum, (map.get(e.datum) ?? 0) + e.gesamtstunden);
    }
    return map;
  }, [entries]);

  const absenceByDate = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of absences) {
      map.set(a.datum, a.art);
    }
    return map;
  }, [absences]);

  const workdays = useMemo(() => {
    const days = einstellungen?.arbeitstageProWoche ?? [
      'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag',
    ];
    return new Set(days);
  }, [einstellungen]);

  const dailySoll = useMemo(() => {
    if (!einstellungen) return 8;
    return einstellungen.wochenstundenSoll / (einstellungen.arbeitstageProWoche.length || 5);
  }, [einstellungen]);

  const weeklySoll = einstellungen?.wochenstundenSoll ?? 40;

  // Current week summary
  const currentWeekSummary = useMemo(() => {
    const today = new Date();
    const monday = getMondayOfWeek(today);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const monStr = toISO(monday);
    const sunStr = toISO(sunday);

    let total = 0;
    for (const e of entries) {
      if (e.datum >= monStr && e.datum <= sunStr) {
        total += e.gesamtstunden;
      }
    }
    return { kw: getISOWeekNumber(today), total };
  }, [entries]);

  const prevMonth = useCallback(() => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }, []);

  const nextMonth = useCallback(() => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }, []);

  const handleDayTap = useCallback(
    (date: Date) => {
      const dateStr = toISO(date);
      setSelectedDate((prev) => (prev === dateStr ? null : dateStr));
    },
    [],
  );

  // Entries for the selected date
  const selectedEntries = useMemo(() => {
    if (!selectedDate) return [];
    return entries.filter((e) => e.datum === selectedDate);
  }, [entries, selectedDate]);

  const baustelleNames = useMemo(() => {
    return new Map(baustellen.map((b) => [b.id, b.name]));
  }, [baustellen]);

  const statusColor: Record<DayStatus, string> = {
    green: 'bg-[#16a34a]',
    orange: 'bg-[#f59e0b]',
    red: 'bg-[#dc2626]',
    blue: 'bg-[#3b82f6]',
    krank: 'bg-[#eab308]',
    gray: 'bg-gray-300 dark:bg-gray-600',
  };

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
      {/* Month selector */}
      <header className="mb-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={prevMonth}
          aria-label="Vorheriger Monat"
          className="size-12"
        >
          <ChevronLeft className="size-6" />
        </Button>
        <h1 className="text-lg font-bold capitalize text-foreground">
          {formatGermanMonth(viewDate)}
        </h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={nextMonth}
          aria-label="Naechster Monat"
          className="size-12"
        >
          <ChevronRight className="size-6" />
        </Button>
      </header>

      {/* Day labels */}
      <div className="mb-1 grid grid-cols-7 text-center text-sm font-medium text-muted-foreground">
        {DAY_LABELS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex flex-col gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((date, di) => {
              const dateStr = toISO(date);
              const isCurrentMonth = date.getMonth() === month;
              const isToday = dateStr === todayStr;
              const status = getDayStatus(
                dateStr,
                di,
                workdays,
                entriesByDate,
                absenceByDate,
                dailySoll,
              );
              const hours = entriesByDate.get(dateStr);
              const isFuture = dateStr > todayStr;

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => handleDayTap(date)}
                  className={`flex flex-col items-center justify-center rounded-lg py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/40'
                  } ${isToday ? 'ring-2 ring-primary' : ''}`}
                  aria-label={`${date.getDate()}. ${formatGermanMonth(date)}${isToday ? ', heute' : ''}`}
                >
                  <span className="text-sm font-medium">{date.getDate()}</span>
                  {!isFuture && isCurrentMonth && (
                    <>
                      <span
                        className={`mt-0.5 size-3 rounded-full ${statusColor[status]} ${
                          status === 'krank'
                            ? 'ring-1 ring-[#eab308] ring-offset-1 ring-offset-background'
                            : ''
                        }`}
                        aria-hidden="true"
                      />
                      {hours !== undefined && hours > 0 && (
                        <span className="mt-0.5 text-[10px] leading-none text-muted-foreground">
                          {formatHours(hours)}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Week summary */}
      <div className="mt-6 rounded-xl bg-card p-4 text-center shadow-sm">
        <p className="text-base font-medium text-foreground">
          KW {currentWeekSummary.kw}: {formatHours(currentWeekSummary.total)} /{' '}
          {formatHours(weeklySoll)} Stunden
        </p>
      </div>

      {/* Selected day entries */}
      {selectedDate && (
        <div className="mt-4">
          <h2 className="mb-2 text-base font-bold text-foreground">
            {new Intl.DateTimeFormat('de-DE', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            }).format(new Date(selectedDate + 'T00:00:00'))}
          </h2>

          {selectedEntries.length === 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">Keine Eintraege.</p>
              <Button
                className="h-12 rounded-xl bg-accent text-base font-semibold text-accent-foreground"
                onClick={() =>
                  navigate('/supereasy', { state: { datum: selectedDate } })
                }
              >
                Eintrag erstellen
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedEntries.map((entry) => {
                const taetigkeiten = entry.positionen.filter(
                  (p) => p.typ === 'taetigkeit' && p.beschreibung.toLowerCase() !== 'pause',
                );
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => navigate(`/eintrag/${entry.id}`)}
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted"
                  >
                    <div className="flex-1">
                      <p className="text-base font-bold text-foreground">
                        {baustelleNames.get(entry.baustelleId) ?? 'Unbekannt'}
                      </p>
                      {taetigkeiten.map((t, i) => (
                        <p key={i} className="text-sm text-muted-foreground">
                          {(t as import('@/types').TaetigkeitPosition).beschreibung}
                        </p>
                      ))}
                    </div>
                    <span className="ml-3 text-lg font-bold text-accent">
                      {formatHours(entry.gesamtstunden)} h
                    </span>
                  </button>
                );
              })}
              <Button
                variant="outline"
                className="h-12 rounded-xl text-base"
                onClick={() =>
                  navigate('/supereasy', { state: { datum: selectedDate } })
                }
              >
                <Plus className="mr-1 size-4" />
                Weiterer Eintrag
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-full bg-[#16a34a]" /> Voll
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-full bg-[#f59e0b]" /> Teilweise
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-full bg-[#dc2626]" /> Fehlend
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-full bg-[#3b82f6]" /> Urlaub
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-full bg-[#eab308] ring-1 ring-[#eab308] ring-offset-1 ring-offset-background" /> Krank
        </span>
      </div>
    </div>
  );
}
