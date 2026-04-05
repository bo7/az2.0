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

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

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
  const wantListeningRef = useRef(false);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    wantListeningRef.current = false;
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

    transcriptRef.current = '';
    setTranscript('');
    setInterimText('');
    lastResultTimeRef.current = Date.now();
    wantListeningRef.current = true;

    function startSession() {
      const recognition = new SR!();
      recognition.lang = 'de-DE';
      recognition.continuous = false;    // Single utterance — avoids mobile duplication bugs
      recognition.interimResults = true;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        lastResultTimeRef.current = Date.now();

        // With continuous=false, take the last result (most complete)
        const last = event.results[event.results.length - 1];
        if (!last || last.length === 0) return;

        const resultObj = last as unknown as { isFinal: boolean };
        const text = last[0].transcript;

        if (resultObj.isFinal) {
          transcriptRef.current = transcriptRef.current
            ? transcriptRef.current + ' ' + text
            : text;
          setTranscript(transcriptRef.current);
          setInterimText('');
        } else {
          setInterimText(text);
        }
      };

      recognition.onend = () => {
        setInterimText('');
        recognitionRef.current = null;

        // On desktop: auto-restart for hands-free experience
        // On mobile: stop (user taps mic again to continue)
        if (!isMobile && wantListeningRef.current) {
          startSession();
        } else {
          // Fire silence callback with whatever we have
          const text = transcriptRef.current;
          if (text && onSilenceRef.current) {
            onSilenceRef.current(text);
          }
          wantListeningRef.current = false;
          setIsListening(false);
          clearSilenceTimer();
        }
      };

      recognition.onerror = () => {
        wantListeningRef.current = false;
        setIsListening(false);
        recognitionRef.current = null;
        clearSilenceTimer();
      };

      recognitionRef.current = recognition;
      recognition.start();
    }

    setIsListening(true);
    startSession();

    // Start silence detection timer (desktop: triggers after silence)
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
      wantListeningRef.current = false;
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
