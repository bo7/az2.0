import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import type { Baustelle, Position, TaetigkeitPosition, MaterialPosition, Einheit } from '@/types';
import type { ParsedZeiteintrag } from '@/lib/llmClient';
import { getSpeechRecognition, hasSpeechSupport } from '@/lib/speechRecognition';
import { useSpeechToEntry } from '@/hooks/useSpeechToEntry';
import AvatarBubble from '@/components/form/AvatarBubble';
import EntryChecklist from '@/components/form/EntryChecklist';
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
  autoStart?: boolean;
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

  e.taetigkeiten.forEach((t) => {
    const pos: TaetigkeitPosition = {
      typ: 'taetigkeit',
      von: e.von,
      bis: e.bis,
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
  autoStart,
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
  const wantListeningRef = useRef(false);

  const hasSpeech = hasSpeechSupport();

  const startSession = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR || !wantListeningRef.current) return;

    // Always create a fresh instance — reusing the same object after onend causes
    // mobile browsers to re-emit the previous transcript (duplicate words)
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onresult = null;
    }

    const rec = new SR();
    rec.lang = 'de-DE';
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event: import('@/lib/speechRecognition').SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result || result.length === 0) continue;
        const isFinal = (event.results[i] as unknown as { isFinal: boolean }).isFinal;
        if (isFinal) {
          const transcript = result[0].transcript.trim();
          if (transcript) {
            setInputText((prev) => (prev ? prev + ' ' + transcript : transcript));
          }
        } else {
          interim += result[0].transcript;
        }
      }
      setInterimText(interim);
    };

    rec.onend = () => {
      setInterimText('');
      if (wantListeningRef.current) {
        // Create a new instance next restart — avoids duplicate transcript bug
        setTimeout(() => startSession(), 100);
      } else {
        setIsListening(false);
        recognitionRef.current = null;
      }
    };

    rec.onerror = (event: Event) => {
      const e = event as unknown as { error: string };
      if (e.error === 'no-speech') return; // normal, onend fires and restarts
      if (e.error === 'aborted') return;   // manual stop
      setIsListening(false);
      wantListeningRef.current = false;
      recognitionRef.current = null;
    };

    recognitionRef.current = rec;
    rec.start();
  }, []);

  // Toggle mic: tap on, tap off
  const handleMicToggle = useCallback(() => {
    if (isListening) {
      wantListeningRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      recognitionRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 100);
      return;
    }

    wantListeningRef.current = true;
    setIsListening(true);
    startSession();
  }, [isListening, startSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Auto-start mic when entering Sprechen mode
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStart && !autoStartedRef.current && hasSpeech && !isListening) {
      autoStartedRef.current = true;
      // Small delay to let component mount
      setTimeout(() => handleMicToggle(), 300);
    }
  }, [autoStart, hasSpeech, isListening, handleMicToggle]);

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
    avatarMessage = '';
    avatarContext = undefined;
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

      {/* Live checklist -- shows what the LLM has captured so far */}
      {(isProcessing || parsedEntries.length > 0 || conversation.length > 0) && (
        <EntryChecklist
          parsed={parsedEntries.length > 0 ? parsedEntries[parsedEntries.length - 1] : null}
          isProcessing={isProcessing}
        />
      )}

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
          placeholder=""
          rows={3}
          className="min-h-[80px] flex-1 resize-none rounded-xl border border-input bg-background px-4 py-3 text-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
