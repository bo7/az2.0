import type { Zeiteintrag, TaetigkeitPosition } from '@/types';
import { cn } from '@/lib/utils';

function formatStunden(stunden: number): string {
  return stunden.toFixed(1).replace('.', ',');
}

function getFirstBeschreibung(eintrag: Zeiteintrag): string | null {
  const first = eintrag.positionen.find(
    (p): p is TaetigkeitPosition => p.typ === 'taetigkeit',
  );
  return first?.beschreibung || null;
}

interface EntryCardProps {
  eintrag: Zeiteintrag;
  baustelleName: string;
  onClick: () => void;
}

export default function EntryCard({
  eintrag,
  baustelleName,
  onClick,
}: EntryCardProps) {
  const taetigkeiten = eintrag.positionen.filter(
    (p): p is TaetigkeitPosition => p.typ === 'taetigkeit',
  );

  const von = taetigkeiten.length > 0 ? taetigkeiten[0].von : '--:--';
  const bis =
    taetigkeiten.length > 0
      ? taetigkeiten[taetigkeiten.length - 1].bis
      : '--:--';

  const beschreibung = getFirstBeschreibung(eintrag);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full min-h-[72px] items-center justify-between',
        'rounded-lg bg-card p-4 shadow-sm',
        'text-left transition-colors active:bg-muted',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
      aria-label={`Zeiteintrag ${baustelleName}, ${von} bis ${bis}, ${formatStunden(eintrag.gesamtstunden)} Stunden`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold text-foreground truncate">
          {baustelleName}
        </p>
        <p className="text-base text-muted-foreground">
          {von} - {bis}
        </p>
        {beschreibung && (
          <p className="mt-0.5 text-sm text-muted-foreground truncate">
            {beschreibung}
          </p>
        )}
      </div>
      <div className="ml-4 shrink-0">
        <span className="text-xl font-bold text-accent">
          {formatStunden(eintrag.gesamtstunden)} h
        </span>
      </div>
    </button>
  );
}
