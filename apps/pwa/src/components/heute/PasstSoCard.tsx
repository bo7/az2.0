import type { SmartDefaults } from '@/hooks/useSmartDefaults';
import { cn } from '@/lib/utils';
import { Pencil } from 'lucide-react';

function computeStunden(von: string, bis: string, pauseDauer: string): string {
  const [vonH, vonM] = von.split(':').map(Number);
  const [bisH, bisM] = bis.split(':').map(Number);
  const [pauseH, pauseM] = pauseDauer.split(':').map(Number);
  const totalMinutes = bisH * 60 + bisM - (vonH * 60 + vonM) - (pauseH * 60 + pauseM);
  const hours = totalMinutes / 60;
  return hours.toFixed(1).replace('.', ',');
}

interface PasstSoCardProps {
  defaults: SmartDefaults;
  pauseDauer: string;
}

export default function PasstSoCard({
  defaults,
  pauseDauer,
}: PasstSoCardProps) {
  const stunden = computeStunden(defaults.von, defaults.bis, pauseDauer);

  return (
    <div
      className={cn(
        'rounded-lg bg-card p-4 shadow-sm',
        'min-h-[72px]',
      )}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-lg font-bold text-foreground truncate">
              {defaults.baustelleName ?? 'Keine Baustelle'}
            </p>
            <Pencil
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
          <p className="text-base text-muted-foreground">
            {defaults.von} - {defaults.bis} | Pause {pauseDauer}
          </p>
          {defaults.beschreibung && (
            <p className="mt-0.5 text-sm italic text-muted-foreground truncate">
              {defaults.beschreibung}
            </p>
          )}
        </div>
        <div className="ml-4 shrink-0">
          <span className="text-xl font-bold text-accent">
            {stunden} h
          </span>
        </div>
      </div>
    </div>
  );
}
