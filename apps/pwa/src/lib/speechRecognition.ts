// Shared Speech Recognition factory -- eliminates duplication between components

export interface SpeechRecognitionResult {
  readonly transcript: string;
  readonly confidence: number;
}

export interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult[];
}

export interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
  readonly resultIndex: number;
}

export interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

export function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  const w = window as unknown as Record<string, unknown>;
  if (typeof w['SpeechRecognition'] === 'function') {
    return w['SpeechRecognition'] as SpeechRecognitionConstructor;
  }
  if (typeof w['webkitSpeechRecognition'] === 'function') {
    return w['webkitSpeechRecognition'] as SpeechRecognitionConstructor;
  }
  return null;
}

export function hasSpeechSupport(): boolean {
  return getSpeechRecognition() !== null;
}
