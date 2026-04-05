import type { ParsedZeiteintrag } from '@/lib/llmClient';
import { Check, Circle } from 'lucide-react';

interface EntryChecklistProps {
  /** Latest parsed result from the LLM (null while no response yet) */
  parsed: ParsedZeiteintrag | null;
  /** True while the LLM is processing */
  isProcessing: boolean;
}

interface CheckItem {
  label: string;
  value: string | null;
  done: boolean;
  optional?: boolean;
}

function buildItems(parsed: ParsedZeiteintrag | null): CheckItem[] {
  const e = parsed?.entry;

  const hasBaustelle = !!e?.baustelleId || !!e?.baustelleName;
  const hasZeiten = !!e?.von && !!e?.bis;
  const hasTaetigkeit = !!e?.taetigkeiten && e.taetigkeiten.length > 0;
  const hasMaterial = !!e?.materialien && e.materialien.length > 0;

  return [
    {
      label: 'Baustelle',
      value: hasBaustelle ? e!.baustelleName : null,
      done: hasBaustelle,
    },
    {
      label: 'Stunden',
      value: hasZeiten ? `${e!.von} – ${e!.bis}` : null,
      done: hasZeiten,
    },
    {
      label: 'Arbeitspaket',
      value: hasTaetigkeit
        ? e!.taetigkeiten.map((t) => t.beschreibung).join(', ')
        : null,
      done: hasTaetigkeit,
    },
    {
      label: 'Material',
      value: hasMaterial
        ? e!.materialien.map((m) => m.bezeichnung).join(', ')
        : null,
      done: hasMaterial,
      optional: true,
    },
  ];
}

export default function EntryChecklist({ parsed, isProcessing }: EntryChecklistProps) {
  const items = buildItems(parsed);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
      {items.map((item) => (
        <div
          key={item.label}
          className={`flex items-start gap-2 transition-all duration-300 ${
            item.done ? 'text-muted-foreground' : 'text-foreground'
          }`}
        >
          {/* Icon */}
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center">
            {item.done ? (
              <Check className="size-4 text-[#16a34a]" />
            ) : (
              <Circle
                className={`size-4 ${
                  item.optional ? 'text-muted-foreground/50' : 'text-muted-foreground'
                }`}
              />
            )}
          </span>

          {/* Label + value */}
          <div className="min-w-0 flex-1">
            <span
              className={`text-sm font-medium ${
                item.done ? 'line-through decoration-[#16a34a]/60' : ''
              } ${item.optional && !item.done ? 'text-muted-foreground/70' : ''}`}
            >
              {item.label}
            </span>

            {item.value && (
              <p className="truncate text-sm text-[#16a34a]">
                {item.value}
              </p>
            )}

            {item.optional && !item.done && (
              <p className="text-xs text-muted-foreground/50">optional</p>
            )}
          </div>
        </div>
      ))}

      {/* Pulsing indicator while LLM processes */}
      {isProcessing && (
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block size-2 animate-pulse rounded-full bg-accent" />
          Wird verarbeitet...
        </div>
      )}
    </div>
  );
}
