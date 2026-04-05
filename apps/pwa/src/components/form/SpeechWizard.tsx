import { useState, useCallback, useRef, useEffect } from 'react';
import type { Baustelle, Position, TaetigkeitPosition, MaterialPosition, Einheit } from '@/types';
import { Button } from '@/components/ui/button';
import { Mic, ChevronLeft, Plus, Check, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Speech Recognition types
// ---------------------------------------------------------------------------

interface SpeechRecognitionResult {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step =
  | 'baustelle'
  | 'zeiten'
  | 'taetigkeit'
  | 'material_frage'
  | 'material_eingabe'
  | 'noch_eine'
  | 'zusammenfassung';

interface TaetigkeitDraft {
  beschreibung: string;
  materialien: MaterialPosition[];
}

interface SpeechWizardProps {
  baustellen: Baustelle[];
  defaultBaustelleId: string | null;
  defaultBaustelleName: string | null;
  defaultVon: string;
  defaultBis: string;
  datumFormatted: string;
  pauseMinutes: number;
  onSave: (data: {
    baustelleId: string;
    von: string;
    bis: string;
    positionen: Position[];
    gesamtstunden: number;
  }) => void;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseTime(text: string): string | null {
  // Try "7 Uhr" or "7:30" or "sieben" etc.
  const cleaned = text.trim().toLowerCase();

  // Direct HH:MM
  const timeMatch = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch) return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;

  // "7 Uhr 30" or "7 Uhr"
  const uhrMatch = cleaned.match(/(\d{1,2})\s*uhr\s*(\d{1,2})?/);
  if (uhrMatch) {
    const h = uhrMatch[1].padStart(2, '0');
    const m = (uhrMatch[2] ?? '0').padStart(2, '0');
    return `${h}:${m}`;
  }

  // Just a number like "7" or "16"
  const numMatch = cleaned.match(/^(\d{1,2})$/);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    if (n >= 0 && n <= 23) return `${numMatch[1].padStart(2, '0')}:00`;
  }

  // German word numbers
  const wordMap: Record<string, string> = {
    'sechs': '06:00', 'sieben': '07:00', 'acht': '08:00',
    'neun': '09:00', 'zehn': '10:00', 'elf': '11:00',
    'zwoelf': '12:00', 'zwölf': '12:00', 'eins': '13:00',
    'zwei': '14:00', 'drei': '15:00', 'vier': '16:00',
    'fuenf': '17:00', 'fünf': '17:00', 'sechzehn': '16:00',
    'siebzehn': '17:00', 'achtzehn': '18:00',
    'viertel nach sieben': '07:15', 'halb acht': '07:30',
  };

  for (const [word, time] of Object.entries(wordMap)) {
    if (cleaned.includes(word)) return time;
  }

  return null;
}

function formatStunden(stunden: number): string {
  return stunden.toFixed(1).replace('.', ',');
}

// ---------------------------------------------------------------------------
// MicButton component
// ---------------------------------------------------------------------------

function MicButton({
  onResult,
  large = false,
}: {
  onResult: (text: string) => void;
  large?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const hasSpeech = getSpeechRecognition() !== null;

  const toggle = useCallback(() => {
    if (recording && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const SR = getSpeechRecognition();
    if (!SR) return;

    const rec = new SR();
    rec.lang = 'de-DE';
    rec.continuous = false;
    rec.interimResults = false;

    rec.onresult = (event: SpeechRecognitionEvent) => {
      if (event.results.length > 0) {
        const r = event.results[0];
        if (r && r.length > 0) onResult(r[0].transcript);
      }
    };
    rec.onend = () => { setRecording(false); recognitionRef.current = null; };
    rec.onerror = () => { setRecording(false); recognitionRef.current = null; };

    recognitionRef.current = rec;
    setRecording(true);
    rec.start();
  }, [recording, onResult]);

  if (!hasSpeech) return null;

  const size = large ? 'size-16' : 'size-12';
  const iconSize = large ? 'size-7' : 'size-5';

  return (
    <button
      type="button"
      onClick={toggle}
      className={`${size} flex items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        recording
          ? 'bg-accent text-white shadow-lg'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      }`}
      aria-label={recording ? 'Stoppen' : 'Sprechen'}
    >
      <Mic className={`${iconSize} ${recording ? 'animate-pulse' : ''}`} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SpeechWizard({
  baustellen,
  defaultBaustelleId,
  defaultBaustelleName,
  defaultVon,
  defaultBis,
  datumFormatted,
  pauseMinutes,
  onSave,
  onCancel,
}: SpeechWizardProps) {
  const [step, setStep] = useState<Step>('baustelle');

  // Collected data
  const [baustelleId, setBaustelleId] = useState(defaultBaustelleId);
  const [baustelleName, setBaustelleName] = useState(defaultBaustelleName ?? '');
  const [von, setVon] = useState(defaultVon);
  const [bis, setBis] = useState(defaultBis);

  // Current taetigkeit being built
  const [currentBeschreibung, setCurrentBeschreibung] = useState('');
  const [currentMaterialName, setCurrentMaterialName] = useState('');
  const [currentMaterialMenge, setCurrentMaterialMenge] = useState('');
  const [currentMaterialEinheit, setCurrentMaterialEinheit] = useState<Einheit>('Stk');

  // Accumulated taetigkeiten with their materials
  const [taetigkeiten, setTaetigkeiten] = useState<TaetigkeitDraft[]>([]);

  // Current taetigkeit's materials (accumulated during material_eingabe loop)
  const [currentMaterialien, setCurrentMaterialien] = useState<MaterialPosition[]>([]);

  // Auto-advance to baustelle confirmation if we have a default
  const hasDefault = defaultBaustelleId !== null;

  // Input ref for text fields
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [step]);

  // -- Handlers --

  const confirmBaustelle = useCallback(() => {
    if (baustelleId) setStep('zeiten');
  }, [baustelleId]);

  const selectBaustelle = useCallback((b: Baustelle) => {
    setBaustelleId(b.id);
    setBaustelleName(b.name);
    setStep('zeiten');
  }, []);

  const confirmZeiten = useCallback(() => {
    setStep('taetigkeit');
  }, []);

  const confirmTaetigkeit = useCallback(() => {
    if (!currentBeschreibung.trim()) return;
    setStep('material_frage');
  }, [currentBeschreibung]);

  const handleMaterialJa = useCallback(() => {
    setCurrentMaterialName('');
    setCurrentMaterialMenge('');
    setCurrentMaterialEinheit('Stk');
    setStep('material_eingabe');
  }, []);

  const handleMaterialNein = useCallback(() => {
    // Save current taetigkeit
    setTaetigkeiten(prev => [...prev, {
      beschreibung: currentBeschreibung.trim(),
      materialien: currentMaterialien,
    }]);
    setCurrentBeschreibung('');
    setCurrentMaterialien([]);
    setStep('noch_eine');
  }, [currentBeschreibung, currentMaterialien]);

  const addMaterial = useCallback(() => {
    if (!currentMaterialName.trim()) return;
    const mat: MaterialPosition = {
      typ: 'material',
      taetigkeitIndex: taetigkeiten.length,
      bezeichnung: currentMaterialName.trim(),
      menge: currentMaterialEinheit === 'ohne' ? null : (parseFloat(currentMaterialMenge) || null),
      einheit: currentMaterialEinheit,
    };
    setCurrentMaterialien(prev => [...prev, mat]);
    // Ask for more materials
    setCurrentMaterialName('');
    setCurrentMaterialMenge('');
    setStep('material_frage');
  }, [currentMaterialName, currentMaterialMenge, currentMaterialEinheit, taetigkeiten.length]);

  const handleNochEineJa = useCallback(() => {
    setStep('taetigkeit');
  }, []);

  const handleNochEineNein = useCallback(() => {
    setStep('zusammenfassung');
  }, []);

  const handleSave = useCallback(() => {
    if (!baustelleId) return;

    const vonMin = parseInt(von.split(':')[0], 10) * 60 + parseInt(von.split(':')[1], 10);
    const bisMin = parseInt(bis.split(':')[0], 10) * 60 + parseInt(bis.split(':')[1], 10);
    const totalMin = bisMin - vonMin - pauseMinutes;
    const gesamtstunden = Math.max(0, totalMin / 60);

    // Build positionen array
    const positionen: Position[] = [];
    const stundenProTaetigkeit = taetigkeiten.length > 0 ? gesamtstunden / taetigkeiten.length : gesamtstunden;

    taetigkeiten.forEach((t, i) => {
      const taetPos: TaetigkeitPosition = {
        typ: 'taetigkeit',
        von: i === 0 ? von : '',
        bis: i === taetigkeiten.length - 1 ? bis : '',
        beschreibung: t.beschreibung,
        stunden: stundenProTaetigkeit,
      };
      positionen.push(taetPos);

      for (const m of t.materialien) {
        positionen.push({ ...m, taetigkeitIndex: i });
      }
    });

    // Add pause
    if (pauseMinutes > 0) {
      positionen.push({
        typ: 'taetigkeit',
        von: '',
        bis: '',
        beschreibung: 'Pause',
        stunden: -(pauseMinutes / 60),
      });
    }

    onSave({ baustelleId, von, bis, positionen, gesamtstunden });
  }, [baustelleId, von, bis, taetigkeiten, pauseMinutes, onSave]);

  const goBack = useCallback(() => {
    switch (step) {
      case 'zeiten': setStep('baustelle'); break;
      case 'taetigkeit': setStep(taetigkeiten.length > 0 ? 'noch_eine' : 'zeiten'); break;
      case 'material_frage': setStep('taetigkeit'); break;
      case 'material_eingabe': setStep('material_frage'); break;
      case 'noch_eine': setStep('taetigkeit'); break;
      case 'zusammenfassung': setStep('noch_eine'); break;
      default: onCancel();
    }
  }, [step, taetigkeiten.length, onCancel]);

  // Speech handler for time inputs
  const handleTimeSpeech = useCallback((setter: (v: string) => void) => (text: string) => {
    const parsed = parseTime(text);
    if (parsed) setter(parsed);
  }, []);

  // -- Render --

  return (
    <div className="flex flex-1 flex-col">
      {/* Back button */}
      <button
        type="button"
        onClick={goBack}
        className="mb-4 flex items-center gap-1 text-muted-foreground"
      >
        <ChevronLeft className="size-5" />
        <span className="text-base">Zurueck</span>
      </button>

      {/* Step: Baustelle */}
      {step === 'baustelle' && (
        <div className="flex flex-1 flex-col gap-4">
          {hasDefault ? (
            <>
              <p className="text-lg text-foreground">
                Arbeitest du heute ({datumFormatted}) auf
              </p>
              <div className="rounded-xl border border-accent bg-accent/5 p-4">
                <p className="text-xl font-bold text-foreground">{baustelleName}</p>
              </div>
              <div className="flex gap-3">
                <Button
                  className="h-14 flex-1 rounded-xl bg-accent text-lg font-bold text-accent-foreground"
                  onClick={confirmBaustelle}
                >
                  Ja
                </Button>
                <Button
                  variant="outline"
                  className="h-14 flex-1 rounded-xl text-lg font-semibold"
                  onClick={() => { setBaustelleId(null); setBaustelleName(''); }}
                >
                  Andere
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-lg text-foreground">
                Auf welcher Baustelle arbeitest du heute?
              </p>
              <div className="flex flex-col gap-2">
                {baustellen.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => selectBaustelle(b)}
                    className={`flex min-h-[56px] items-center rounded-xl border px-4 py-3 text-left transition-colors ${
                      baustelleId === b.id
                        ? 'border-accent bg-accent/10 font-semibold'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <div>
                      <p className="text-base font-medium text-foreground">{b.name}</p>
                      <p className="text-sm text-muted-foreground">{b.adresse}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Step: Zeiten */}
      {step === 'zeiten' && (
        <div className="flex flex-1 flex-col gap-4">
          <p className="text-lg text-foreground">Von wann bis wann?</p>

          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm text-muted-foreground">Von</label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={von}
                  onChange={e => setVon(e.target.value)}
                  className="h-14 flex-1 rounded-xl border border-input bg-background px-3 text-center text-2xl font-bold text-foreground"
                />
                <MicButton onResult={handleTimeSpeech(setVon)} />
              </div>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm text-muted-foreground">Bis</label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={bis}
                  onChange={e => setBis(e.target.value)}
                  className="h-14 flex-1 rounded-xl border border-input bg-background px-3 text-center text-2xl font-bold text-foreground"
                />
                <MicButton onResult={handleTimeSpeech(setBis)} />
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Pause: {pauseMinutes} min werden abgezogen
          </p>

          <Button
            className="mt-auto h-14 rounded-xl bg-accent text-lg font-bold text-accent-foreground"
            onClick={confirmZeiten}
          >
            Weiter
          </Button>
        </div>
      )}

      {/* Step: Taetigkeit */}
      {step === 'taetigkeit' && (
        <div className="flex flex-1 flex-col gap-4">
          <p className="text-lg text-foreground">
            {taetigkeiten.length === 0
              ? 'Was hast du gemacht?'
              : 'Was hast du noch gemacht?'}
          </p>

          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={currentBeschreibung}
              onChange={e => setCurrentBeschreibung(e.target.value)}
              placeholder="Taetigkeit beschreiben..."
              className="h-14 flex-1 rounded-xl border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <MicButton
              large
              onResult={text => setCurrentBeschreibung(prev => prev ? prev + ', ' + text : text)}
            />
          </div>

          <Button
            className="mt-auto h-14 rounded-xl bg-accent text-lg font-bold text-accent-foreground"
            onClick={confirmTaetigkeit}
            disabled={!currentBeschreibung.trim()}
          >
            Weiter
          </Button>
        </div>
      )}

      {/* Step: Material frage */}
      {step === 'material_frage' && (
        <div className="flex flex-1 flex-col gap-4">
          <p className="text-lg text-foreground">
            Material verwendet bei &quot;{currentBeschreibung}&quot;?
          </p>

          {currentMaterialien.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-muted-foreground">Bereits erfasst:</p>
              {currentMaterialien.map((m, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                  <span className="text-base text-foreground">
                    {m.bezeichnung}{m.menge !== null ? ` (${m.menge} ${m.einheit})` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentMaterialien(prev => prev.filter((_, j) => j !== i))}
                    className="text-muted-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              className="h-14 flex-1 rounded-xl bg-accent text-lg font-bold text-accent-foreground"
              onClick={handleMaterialJa}
            >
              <Plus className="mr-1 size-5" />
              {currentMaterialien.length > 0 ? 'Noch eins' : 'Ja'}
            </Button>
            <Button
              variant="outline"
              className="h-14 flex-1 rounded-xl text-lg font-semibold"
              onClick={handleMaterialNein}
            >
              {currentMaterialien.length > 0 ? 'Fertig' : 'Nein'}
            </Button>
          </div>
        </div>
      )}

      {/* Step: Material eingabe */}
      {step === 'material_eingabe' && (
        <div className="flex flex-1 flex-col gap-4">
          <p className="text-lg text-foreground">Welches Material?</p>

          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={currentMaterialName}
              onChange={e => setCurrentMaterialName(e.target.value)}
              placeholder="Bezeichnung..."
              className="h-14 flex-1 rounded-xl border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <MicButton onResult={text => setCurrentMaterialName(text)} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Menge</label>
            <input
              type="text"
              inputMode="decimal"
              value={currentMaterialMenge}
              onChange={e => setCurrentMaterialMenge(e.target.value)}
              placeholder="z.B. 12"
              className="h-14 w-full rounded-xl border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Einheit</label>
            <div className="flex gap-2">
              {(['Stk', 'm', 'm2', 'VE', 'ohne'] as Einheit[]).map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setCurrentMaterialEinheit(e)}
                  className={`min-h-[48px] flex-1 rounded-xl border text-base font-medium transition-colors ${
                    currentMaterialEinheit === e
                      ? 'border-accent bg-accent text-white'
                      : 'border-border bg-card text-foreground'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <Button
            className="mt-auto h-14 rounded-xl bg-accent text-lg font-bold text-accent-foreground"
            onClick={addMaterial}
            disabled={!currentMaterialName.trim()}
          >
            Hinzufuegen
          </Button>
        </div>
      )}

      {/* Step: Noch eine Taetigkeit? */}
      {step === 'noch_eine' && (
        <div className="flex flex-1 flex-col gap-4">
          <p className="text-lg text-foreground">Noch eine Taetigkeit?</p>

          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-muted-foreground">Bisher erfasst:</p>
            {taetigkeiten.map((t, i) => (
              <div key={i} className="rounded-lg bg-muted px-3 py-2">
                <p className="text-base font-medium text-foreground">{t.beschreibung}</p>
                {t.materialien.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t.materialien.map(m => m.bezeichnung).join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-auto flex gap-3">
            <Button
              className="h-14 flex-1 rounded-xl bg-accent text-lg font-bold text-accent-foreground"
              onClick={handleNochEineJa}
            >
              <Plus className="mr-1 size-5" />
              Ja
            </Button>
            <Button
              variant="outline"
              className="h-14 flex-1 rounded-xl text-lg font-semibold"
              onClick={handleNochEineNein}
            >
              Fertig
            </Button>
          </div>
        </div>
      )}

      {/* Step: Zusammenfassung */}
      {step === 'zusammenfassung' && (
        <div className="flex flex-1 flex-col gap-4">
          <p className="text-lg font-bold text-foreground">Zusammenfassung</p>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">{datumFormatted}</p>
            <p className="text-base font-bold text-foreground">{baustelleName}</p>
            <p className="mt-1 text-base text-foreground">{von} - {bis} Uhr</p>
            <p className="text-sm text-muted-foreground">Pause: {pauseMinutes} min</p>

            <div className="mt-3 border-t border-border pt-3">
              {taetigkeiten.map((t, i) => (
                <div key={i} className="mb-2">
                  <p className="text-base text-foreground">
                    <Check className="mr-1 inline size-4 text-[#16a34a]" />
                    {t.beschreibung}
                  </p>
                  {t.materialien.map((m, j) => (
                    <p key={j} className="ml-6 text-sm text-muted-foreground">
                      {m.bezeichnung}
                      {m.menge !== null ? ` - ${m.menge} ${m.einheit}` : ''}
                    </p>
                  ))}
                </div>
              ))}
            </div>

            {(() => {
              const vonMin = parseInt(von.split(':')[0], 10) * 60 + parseInt(von.split(':')[1], 10);
              const bisMin = parseInt(bis.split(':')[0], 10) * 60 + parseInt(bis.split(':')[1], 10);
              const total = Math.max(0, (bisMin - vonMin - pauseMinutes) / 60);
              return (
                <p className="mt-3 border-t border-border pt-3 text-center text-xl font-bold text-accent">
                  {formatStunden(total)} h
                </p>
              );
            })()}
          </div>

          <Button
            className="h-16 rounded-xl bg-[#16a34a] text-xl font-bold text-white hover:bg-[#16a34a]/90"
            onClick={handleSave}
          >
            Passt so
          </Button>
          <Button
            variant="outline"
            className="h-12 rounded-xl text-base"
            onClick={() => setStep('baustelle')}
          >
            Von vorne
          </Button>
        </div>
      )}
    </div>
  );
}
