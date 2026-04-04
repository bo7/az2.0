import { useState, useCallback, useRef } from 'react';
import type { Suggestion } from '@/hooks/useTaetigkeitSuggestions';
import { Mic } from 'lucide-react';

interface TaetigkeitChipsProps {
  suggestions: Suggestion[];
  value: string;
  onChange: (v: string) => void;
}

// Global type declarations for SpeechRecognition API
interface SpeechRecognitionResult {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult[];
  [index: number]: SpeechRecognitionResult[];
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  const w = window as unknown as Record<string, unknown>;
  if (typeof w['SpeechRecognition'] === 'function') {
    return w['SpeechRecognition'] as SpeechRecognitionConstructor;
  }
  if (typeof w['webkitSpeechRecognition'] === 'function') {
    return w['webkitSpeechRecognition'] as SpeechRecognitionConstructor;
  }
  return null;
}

export default function TaetigkeitChips({
  suggestions,
  value,
  onChange,
}: TaetigkeitChipsProps) {
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const hasSpeech = getSpeechRecognition() !== null;

  const handleMicClick = useCallback(() => {
    if (recording && recognitionRef.current) {
      recognitionRef.current.stop();
      setRecording(false);
      return;
    }

    const SRConstructor = getSpeechRecognition();
    if (!SRConstructor) return;

    const recognition = new SRConstructor();
    recognition.lang = 'de-DE';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = event.results;
      if (results.length > 0) {
        const firstResult = results[0];
        if (firstResult && firstResult.length > 0) {
          const transcript = firstResult[0].transcript;
          onChange(transcript);
        }
      }
    };

    recognition.onend = () => {
      setRecording(false);
      recognitionRef.current = null;
    };

    recognition.onerror = () => {
      setRecording(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setRecording(true);
    recognition.start();
  }, [recording, onChange]);

  const selectedChip = suggestions.find(
    (s) => s.text.toLowerCase() === value.toLowerCase(),
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Chips */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => {
            const isActive =
              s.text.toLowerCase() === value.toLowerCase();
            return (
              <button
                key={s.text}
                type="button"
                onClick={() => onChange(s.text)}
                className={`min-h-[48px] rounded-full border px-4 py-2 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isActive
                    ? 'border-accent bg-accent text-white'
                    : 'border-border bg-card text-foreground hover:bg-muted'
                }`}
              >
                {s.text}
              </button>
            );
          })}
        </div>
      )}

      {/* Text input with optional mic */}
      <div className="relative">
        <input
          type="text"
          placeholder="Eigene Eingabe..."
          value={selectedChip ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full rounded-lg border border-input bg-background px-4 pr-14 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {hasSpeech && (
          <button
            type="button"
            onClick={handleMicClick}
            className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={recording ? 'Spracherkennung stoppen' : 'Spracheingabe'}
          >
            <Mic
              className={`size-5 ${recording ? 'animate-pulse text-accent' : ''}`}
            />
          </button>
        )}
      </div>
    </div>
  );
}
