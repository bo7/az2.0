import { useState, useCallback, useRef, useEffect } from 'react';
import {
  getSpeechRecognition,
  hasSpeechSupport,
} from '@/lib/speechRecognition';
import type {
  SpeechRecognitionInstance,
  SpeechRecognitionEvent,
} from '@/lib/speechRecognition';

interface UseContinuousSpeechOptions {
  silenceTimeoutMs?: number;
  onSilenceTimeout?: (transcript: string) => void;
}

interface UseContinuousSpeechReturn {
  isListening: boolean;
  transcript: string;
  interimText: string;
  hasSpeech: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export function useContinuousSpeech(
  options?: UseContinuousSpeechOptions,
): UseContinuousSpeechReturn {
  const silenceMs = options?.silenceTimeoutMs ?? 2000;
  const onSilenceRef = useRef(options?.onSilenceTimeout);
  onSilenceRef.current = options?.onSilenceTimeout;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const lastResultTimeRef = useRef(0);
  const silenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef('');

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimText('');
  }, [clearSilenceTimer]);

  const startListening = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) return;

    // Stop any existing
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = new SR();
    recognition.lang = 'de-DE';
    recognition.continuous = true;
    recognition.interimResults = true;

    transcriptRef.current = '';
    setTranscript('');
    setInterimText('');
    lastResultTimeRef.current = Date.now();

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      lastResultTimeRef.current = Date.now();

      let finalText = '';
      let interim = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result && result.length > 0) {
          // Check if result is final (isFinal property on the result list item)
          const resultObj = event.results[i] as unknown as { isFinal: boolean };
          if (resultObj.isFinal) {
            finalText += result[0].transcript + ' ';
          } else {
            interim += result[0].transcript;
          }
        }
      }

      if (finalText) {
        transcriptRef.current = finalText.trim();
        setTranscript(finalText.trim());
      }
      setInterimText(interim);
    };

    recognition.onend = () => {
      // Auto-restart if still listening (browser may stop continuous mode)
      if (recognitionRef.current === recognition) {
        // Fire silence timeout with whatever we have
        const text = transcriptRef.current;
        if (text && onSilenceRef.current) {
          onSilenceRef.current(text);
        }
        setIsListening(false);
        recognitionRef.current = null;
        clearSilenceTimer();
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
      clearSilenceTimer();
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();

    // Start silence detection timer
    clearSilenceTimer();
    silenceTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastResultTimeRef.current;
      const text = transcriptRef.current;
      if (elapsed >= silenceMs && text) {
        stopListening();
        if (onSilenceRef.current) {
          onSilenceRef.current(text);
        }
      }
    }, 500);
  }, [silenceMs, stopListening, clearSilenceTimer]);

  const resetTranscript = useCallback(() => {
    transcriptRef.current = '';
    setTranscript('');
    setInterimText('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current);
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    interimText,
    hasSpeech: hasSpeechSupport(),
    startListening,
    stopListening,
    resetTranscript,
  };
}
