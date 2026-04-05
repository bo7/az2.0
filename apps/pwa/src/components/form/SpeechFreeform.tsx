import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import type { Baustelle, Position, TaetigkeitPosition, MaterialPosition, Einheit } from '@/types';
import type { ParsedZeiteintrag } from '@/lib/llmClient';
import { getSpeechRecognition, hasSpeechSupport } from '@/lib/speechRecognition';
import { useSpeechToEntry } from '@/hooks/useSpeechToEntry';
import AvatarBubble from '@/components/form/AvatarBubble';
import ParsedEntryCard from '@/components/form/ParsedEntryCard';
import { Button } from '@/components/ui/button';
import { Mic, Send } from 'lucide-react';

interface SpeechFreeformProps {
  baustellen: Baustelle[];
  defaultBaustelleId: string | null;
  defaultBaustelleName: string | null;
  defaultVon: string;
  defaultBis: string;
  datum: string;
  pauseMinutes: number;
  taetigkeitenKatalog: string[];
  onSave: (entries: {
    baustelleId: string;
    von: string;
    bis: string;
    positionen: Position[];
    gesamtstunden: number;
  }[]) => void;
  onCancel: () => void;
}

function parsedToPositionen(
  entry: ParsedZeiteintrag,
  pauseMinutes: number,
): { positionen: Position[]; gesamtstunden: number } {
  const e = entry.entry;
  const positionen: Position[] = [];

  // Calculate total hours
  const [vh, vm] = e.von.split(':').map(Number);
  const [bh, bm] = e.bis.split(':').map(Number);
  const totalMin = bh * 60 + bm - (vh * 60 + vm) - pauseMinutes;
  const gesamtstunden = Math.max(0, totalMin / 60);

  const stundenPro =
    e.taetigkeiten.length > 0 ? gesamtstunden / e.taetigkeiten.length : gesamtstunden;

  e.taetigkeiten.forEach((t, i) => {
    const pos: TaetigkeitPosition = {
      typ: 'taetigkeit',
      von: i === 0 ? e.von : '',
      bis: i === e.taetigkeiten.length - 1 ? e.bis : '',
      beschreibung: t.beschreibung,
      stunden: t.stunden ?? stundenPro,
    };
    positionen.push(pos);
  });

  // Materials
  for (const m of e.materialien) {
    const validEinheiten: Einheit[] = ['Stk', 'm', 'm2', 'VE', 'ohne'];
    const einheit: Einheit = validEinheiten.includes(m.einheit as Einheit)
      ? (m.einheit as Einheit)
      : 'Stk';
    const mat: MaterialPosition = {
      typ: 'material',
      taetigkeitIndex: m.taetigkeitIndex,
      bezeichnung: m.bezeichnung,
      menge: m.menge,
      einheit,
    };
    positionen.push(mat);
  }

  // Pause
  if (pauseMinutes > 0) {
    positionen.push({
      typ: 'taetigkeit',
      von: '',
      bis: '',
      beschreibung: 'Pause',
      stunden: -(pauseMinutes / 60),
    });
  }

  return { positionen, gesamtstunden };
}

export default function SpeechFreeform({
  baustellen,
  defaultBaustelleId,
  defaultBaustelleName,
  datum,
  pauseMinutes,
  taetigkeitenKatalog,
  onSave,
}: SpeechFreeformProps) {
  const context = useMemo(
    () => ({
      baustellen: baustellen.map((b) => ({ id: b.id, name: b.name })),
      defaultBaustelleId,
      defaultBaustelleName,
      datum,
      taetigkeitenKatalog,
    }),
    [baustellen, defaultBaustelleId, defaultBaustelleName, datum, taetigkeitenKatalog],
  );

  const {
    parsedEntries,
    isProcessing,
    error,
    conversation,
    followUpQuestion,
    sendText,
    resetConversation,
  } = useSpeechToEntry(context);

  // Editable input field -- speech fills it, user can correct before sending
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<import('@/lib/speechRecognition').SpeechRecognitionInstance | null>(null);
  const accumulatedRef = useRef('');

  const hasSpeech = hasSpeechSupport();

  // Toggle mic: tap on, tap off. All accumulated text goes to input field on stop.
  const handleMicToggle = useCallback(() => {
    if (isListening) {
      // Stop -- put accumulated text into editable field
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    const SR = getSpeechRecognition();
    if (!SR) return;

    const rec = new SR();
    rec.lang = 'de-DE';
    rec.continuous = true;
    rec.interimResults = true;
    accumulatedRef.current = '';

    rec.onresult = (event: import('@/lib/speechRecognition').SpeechRecognitionEvent) => {
      let finalText = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result && result.length > 0) {
          const isFinal = (event.results[i] as unknown as { isFinal: boolean }).isFinal;
          if (isFinal) {
            finalText += result[0].transcript + ' ';
          } else {
            interim += result[0].transcript;
          }
        }
      }
      if (finalText) {
        accumulatedRef.current = finalText.trim();
      }
      setInterimText(interim);
    };

    rec.onend = () => {
      // Put everything into the editable field
      const text = accumulatedRef.current;
      if (text) {
        setInputText((prev) => (prev ? prev + ' ' + text : text));
      }
      setIsListening(false);
      setInterimText('');
      recognitionRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 100);
    };

    rec.onerror = () => {
      setIsListening(false);
      setInterimText('');
      recognitionRef.current = null;
    };

    recognitionRef.current = rec;
    setIsListening(true);
    rec.start();
  }, [isListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Send the editable text to LLM
  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    void sendText(text);
    setInputText('');
  }, [inputText, sendText]);

  // Auto-focus input after follow-up question
  useEffect(() => {
    if (followUpQuestion && inputRef.current) {
      inputRef.current.focus();
    }
  }, [followUpQuestion]);

  const handleSaveAll = useCallback(() => {
    const entries = parsedEntries
      .filter((e) => e.complete && e.entry.baustelleId)
      .map((e) => {
        const { positionen, gesamtstunden } = parsedToPositionen(e, pauseMinutes);
        return {
          baustelleId: e.entry.baustelleId!,
          von: e.entry.von,
          bis: e.entry.bis,
          positionen,
          gesamtstunden,
        };
      });

    if (entries.length > 0) {
      onSave(entries);
    }
  }, [parsedEntries, pauseMinutes, onSave]);

  // Determine avatar message
  let avatarMessage: string;
  let avatarContext: string | undefined;
  let avatarThinking = false;

  if (isProcessing) {
    avatarMessage = '';
    avatarThinking = true;
  } else if (error) {
    avatarMessage = error;
  } else if (followUpQuestion) {
    avatarMessage = followUpQuestion;
  } else if (parsedEntries.length > 0) {
    avatarMessage = 'Eintrag erfasst! Noch weitere Eintraege?';
  } else if (conversation.length === 0) {
    avatarMessage = 'Erzaehl einfach was du gemacht hast. Wenn du 2 Sekunden stoppst, werden deine Daten eingetragen.';
    avatarContext = defaultBaustelleName
      ? `Du buchst auf ${defaultBaustelleName}. Sag einfach wenn du auf einer anderen gearbeitet hast.`
      : undefined;
  } else {
    avatarMessage = conversation[conversation.length - 1]?.text ?? '';
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Avatar */}
      <AvatarBubble
        message={avatarMessage}
        contextLine={avatarContext}
        isThinking={avatarThinking}
      />

      {/* Interim text while listening */}
      {isListening && interimText && (
        <p className="rounded-xl bg-muted/50 px-4 py-2 text-base italic text-muted-foreground">
          {interimText}
        </p>
      )}
      {isListening && !interimText && (
        <p className="rounded-xl bg-muted/50 px-4 py-2 text-base text-muted-foreground">
          Ich hoere zu...
        </p>
      )}

      {/* Editable text input + Mic + Send */}
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={followUpQuestion ? 'Antwort eingeben...' : 'Sprich oder tippe...'}
          rows={2}
          className="min-h-[56px] flex-1 resize-none rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        {/* Mic button */}
        {hasSpeech && (
          <button
            type="button"
            onClick={handleMicToggle}
            disabled={isProcessing}
            className={`flex size-14 shrink-0 items-center justify-center rounded-full shadow transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${
              isListening
                ? 'bg-accent text-white scale-105'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            aria-label={isListening ? 'Aufnahme stoppen' : 'Sprechen'}
          >
            <Mic className={`size-6 ${isListening ? 'animate-pulse' : ''}`} />
          </button>
        )}

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={isProcessing || !inputText.trim()}
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow transition-all hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          aria-label="Senden"
        >
          <Send className="size-6" />
        </button>
      </div>

      {/* Parsed entries */}
      {parsedEntries.length > 0 && (
        <div className="flex flex-col gap-3">
          {parsedEntries.map((entry, i) => (
            <ParsedEntryCard key={i} entry={entry} />
          ))}

          <Button
            className="h-16 rounded-xl bg-[#16a34a] text-xl font-bold text-white hover:bg-[#16a34a]/90"
            onClick={handleSaveAll}
          >
            {parsedEntries.length === 1
              ? 'Eintrag speichern'
              : `${parsedEntries.length} Eintraege speichern`}
          </Button>
        </div>
      )}

      {/* Reset */}
      {conversation.length > 0 && (
        <button
          type="button"
          onClick={resetConversation}
          className="text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Von vorne beginnen
        </button>
      )}
    </div>
  );
}
