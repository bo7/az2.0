import { cn } from '@/lib/utils';

function formatStunden(stunden: number): string {
  return stunden.toFixed(1).replace('.', ',');
}

interface DaySummaryProps {
  stunden: number;
  soll?: number;
}

export default function DaySummary({ stunden, soll = 8 }: DaySummaryProps) {
  let bgClass: string;
  if (stunden === 0) {
    bgClass = 'bg-destructive text-white';
  } else if (stunden >= soll) {
    bgClass = 'bg-success text-success-foreground';
  } else {
    bgClass = 'bg-warning text-warning-foreground';
  }

  return (
    <div
      className={cn(
        'flex min-h-[48px] items-center justify-center rounded-lg px-4 py-3',
        bgClass,
      )}
      role="status"
      aria-label={`Tagessumme: ${formatStunden(stunden)} Stunden`}
    >
      <span className="text-lg font-bold">
        Tagessumme: {formatStunden(stunden)} h
      </span>
    </div>
  );
}
