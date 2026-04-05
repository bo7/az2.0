import { useState, useCallback, useRef } from 'react';
import { parseZeiteintrag } from '@/lib/llmClient';
import type { ParsedZeiteintrag } from '@/lib/llmClient';

interface ConversationMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface SpeechToEntryContext {
  baustellen: { id: string; name: string }[];
  defaultBaustelleId: string | null;
  defaultBaustelleName: string | null;
  datum: string;
  taetigkeitenKatalog: string[];
}

interface UseSpeechToEntryReturn {
  parsedEntries: ParsedZeiteintrag[];
  isProcessing: boolean;
  error: string | null;
  conversation: ConversationMessage[];
  followUpQuestion: string | null;
  sendText: (text: string) => Promise<void>;
  confirmEntry: () => void;
  resetConversation: () => void;
}

export function useSpeechToEntry(
  context: SpeechToEntryContext,
): UseSpeechToEntryReturn {
  const [parsedEntries, setParsedEntries] = useState<ParsedZeiteintrag[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [followUpQuestion, setFollowUpQuestion] = useState<string | null>(null);

  // Track conversation history for follow-ups
  const historyRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>(
    [],
  );

  const sendText = useCallback(
    async (text: string) => {
      setIsProcessing(true);
      setError(null);

      setConversation((prev) => [...prev, { role: 'user', text }]);

      try {
        const result = await parseZeiteintrag(
          text,
          context,
          historyRef.current.length > 0 ? historyRef.current : undefined,
        );

        // Add to conversation history for follow-ups
        historyRef.current.push({ role: 'user', content: text });

        if (result.complete) {
          setParsedEntries((prev) => [...prev, result]);
          setFollowUpQuestion(null);
          historyRef.current = []; // Reset for next entry

          setConversation((prev) => [
            ...prev,
            { role: 'assistant', text: 'Eintrag erfasst. Noch weitere?' },
          ]);
        } else if (result.followUpQuestion) {
          setFollowUpQuestion(result.followUpQuestion);
          historyRef.current.push({
            role: 'assistant',
            content: result.followUpQuestion,
          });

          setConversation((prev) => [
            ...prev,
            { role: 'assistant', text: result.followUpQuestion! },
          ]);
        }
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : 'Verbindungsproblem zum Server';
        setError(msg);
        setConversation((prev) => [
          ...prev,
          { role: 'assistant', text: `Fehler: ${msg}. Bitte nochmal versuchen.` },
        ]);
      } finally {
        setIsProcessing(false);
      }
    },
    [context],
  );

  const confirmEntry = useCallback(() => {
    // Entry is already in parsedEntries, just clear follow-up state
    setFollowUpQuestion(null);
    historyRef.current = [];
  }, []);

  const resetConversation = useCallback(() => {
    setParsedEntries([]);
    setConversation([]);
    setFollowUpQuestion(null);
    setError(null);
    historyRef.current = [];
  }, []);

  return {
    parsedEntries,
    isProcessing,
    error,
    conversation,
    followUpQuestion,
    sendText,
    confirmEntry,
    resetConversation,
  };
}
