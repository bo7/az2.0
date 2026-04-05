import type { ParsedZeiteintrag } from '@/lib/llmClient';
import { Check, X } from 'lucide-react';

interface ParsedEntryCardProps {
  entry: ParsedZeiteintrag;
  onDelete?: () => void;
}

function formatStunden(von: string, bis: string, pauseMin: number): string {
  if (!von || !bis) return '?';
  const [vh, vm] = von.split(':').map(Number);
  const [bh, bm] = bis.split(':').map(Number);
  const total = (bh * 60 + bm - (vh * 60 + vm) - pauseMin) / 60;
  return Math.max(0, total).toFixed(1).replace('.', ',');
}

export default function ParsedEntryCard({
  entry,
  onDelete,
}: ParsedEntryCardProps) {
  const e = entry.entry;

  return (
    <div className="rounded-xl border-2 border-[#16a34a] bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Baustelle */}
          <p className="text-base font-bold text-foreground">
            {e.baustelleName ?? 'Unbekannte Baustelle'}
          </p>

          {/* Zeiten */}
          <p className="mt-1 text-base text-foreground">
            {e.von} - {e.bis} Uhr
            <span className="ml-2 font-bold text-accent">
              {formatStunden(e.von, e.bis, 30)} h
            </span>
          </p>

          {/* Taetigkeiten */}
          {e.taetigkeiten.map((t, i) => (
            <p key={i} className="mt-1 text-sm text-foreground">
              <Check className="mr-1 inline size-4 text-[#16a34a]" />
              {t.beschreibung}
            </p>
          ))}

          {/* Materialien */}
          {e.materialien.length > 0 && (
            <div className="mt-2 border-t border-border pt-2">
              {e.materialien.map((m, i) => (
                <p key={i} className="text-sm text-muted-foreground">
                  {m.bezeichnung}
                  {m.menge !== null ? ` - ${m.menge} ${m.einheit}` : ''}
                </p>
              ))}
            </div>
          )}
        </div>

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="ml-2 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Eintrag entfernen"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
