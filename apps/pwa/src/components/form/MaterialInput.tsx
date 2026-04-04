import { useState, useRef } from 'react';
import type { Einheit } from '@/types';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

const EINHEIT_OPTIONS: Einheit[] = ['Stk', 'm', 'm2', 'VE', 'ohne'];

interface MaterialInputProps {
  value: { bezeichnung: string; menge: number | null; einheit: Einheit };
  onChange: (v: { bezeichnung: string; menge: number | null; einheit: Einheit }) => void;
  onDelete: () => void;
  suggestions?: string[];
}

export default function MaterialInput({
  value,
  onChange,
  onDelete,
  suggestions = [],
}: MaterialInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(value.bezeichnung.toLowerCase()) &&
      s.toLowerCase() !== value.bezeichnung.toLowerCase(),
  );

  function handleEinheitChange(einheit: Einheit) {
    if (einheit === 'ohne') {
      onChange({ ...value, einheit, menge: null });
    } else {
      onChange({
        ...value,
        einheit,
        menge: value.menge ?? 1,
      });
    }
  }

  function handleMengeChange(raw: string) {
    // Allow German comma decimal separator
    const normalized = raw.replace(',', '.');
    const parsed = parseFloat(normalized);
    onChange({
      ...value,
      menge: isNaN(parsed) ? null : parsed,
    });
  }

  function handleSelectSuggestion(s: string) {
    onChange({ ...value, bezeichnung: s });
    setShowSuggestions(false);
    inputRef.current?.blur();
  }

  return (
    <div className="flex flex-col gap-2 rounded-md bg-muted py-2 pr-2 pl-6">
      {/* Top row: Bezeichnung + delete */}
      <div className="flex items-center gap-2">
        <span
          className="shrink-0 text-xs font-medium text-muted-foreground"
          aria-hidden="true"
        >
          Mat.
        </span>

        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={value.bezeichnung}
            onChange={(e) => {
              onChange({ ...value, bezeichnung: e.target.value });
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              // Delay to allow click on suggestion
              setTimeout(() => setShowSuggestions(false), 150);
            }}
            placeholder="Bezeichnung"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Material-Bezeichnung"
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <ul className="absolute top-full right-0 left-0 z-20 mt-1 max-h-40 overflow-y-auto rounded-md border border-border bg-card shadow-md">
              {filteredSuggestions.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectSuggestion(s)}
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={onDelete}
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label="Material entfernen"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Bottom row: Menge + Einheit pills */}
      <div className="flex items-center gap-2 pl-9">
        {value.einheit !== 'ohne' && (
          <input
            type="text"
            inputMode="decimal"
            value={
              value.menge !== null
                ? String(value.menge).replace('.', ',')
                : ''
            }
            onChange={(e) => handleMengeChange(e.target.value)}
            placeholder="Menge"
            className="h-10 w-20 rounded-md border border-input bg-background px-3 text-center text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Menge"
          />
        )}

        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Einheit">
          {EINHEIT_OPTIONS.map((e) => (
            <button
              key={e}
              type="button"
              role="radio"
              aria-checked={value.einheit === e}
              onClick={() => handleEinheitChange(e)}
              className={cn(
                'h-8 rounded-full px-3 text-xs font-medium transition-colors',
                value.einheit === e
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
              )}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
