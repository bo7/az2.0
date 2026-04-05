// LLM API client -- supports Ollama, local MLX server, and Google Gemini Flash
//
// Provider selection via VITE_LLM_PROVIDER:
//   "ollama" → Ollama on local network (default)
//   "local"  → mlx_lm.server on mac2
//   "gemini" → Google Gemini Flash via OpenAI-compatible endpoint

type LLMProvider = 'ollama' | 'local' | 'gemini';

const LLM_PROVIDER: LLMProvider =
  (import.meta.env.VITE_LLM_PROVIDER as LLMProvider) ?? 'ollama';

// Ollama config
const OLLAMA_API_URL = import.meta.env.VITE_OLLAMA_API_URL ?? 'http://10.200.0.11:11434';
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL ?? 'gemma4:31b';

// Local MLX config
const LOCAL_API_URL = import.meta.env.VITE_LLM_API_URL ?? 'http://10.200.0.12:8899';
const LOCAL_MODEL = import.meta.env.VITE_LLM_MODEL ?? 'mlx-community/Llama-3.1-Nemotron-70B-Instruct-HF-8bit';

// Gemini config (OpenAI-compatible endpoint)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? '';
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL ?? 'gemini-2.5-flash-preview-05-20';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

function getProviderConfig(): { url: string; model: string; headers: Record<string, string> } {
  if (LLM_PROVIDER === 'gemini') {
    return {
      url: `${GEMINI_API_URL}/chat/completions`,
      model: GEMINI_MODEL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GEMINI_API_KEY}`,
      },
    };
  }
  if (LLM_PROVIDER === 'ollama') {
    return {
      url: `${OLLAMA_API_URL}/v1/chat/completions`,
      model: OLLAMA_MODEL,
      headers: { 'Content-Type': 'application/json' },
    };
  }
  return {
    url: `${LOCAL_API_URL}/v1/chat/completions`,
    model: LOCAL_MODEL,
    headers: { 'Content-Type': 'application/json' },
  };
}

export async function sendChatCompletion(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const config = getProviderConfig();

  const response = await fetch(config.url, {
    method: 'POST',
    headers: config.headers,
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: options?.temperature ?? 0.1,
      max_tokens: options?.maxTokens ?? 1024,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM API error (${LLM_PROVIDER}): ${response.status}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  // Strip special tokens from MLX output
  return (data.choices[0]?.message?.content ?? '').replace(/<\|[^|]+\|>/g, '').trim();
}

export interface ParsedZeiteintrag {
  complete: boolean;
  entry: {
    baustelleId: string | null;
    baustelleName: string | null;
    von: string;
    bis: string;
    taetigkeiten: { beschreibung: string; stunden: number | null }[];
    materialien: {
      bezeichnung: string;
      menge: number | null;
      einheit: string;
      taetigkeitIndex: number;
    }[];
  };
  followUpQuestion: string | null;
  newTaetigkeiten: string[];
  newMaterialien: string[];
}

export function buildSystemPrompt(context: {
  baustellen: { id: string; name: string }[];
  defaultBaustelleId: string | null;
  defaultBaustelleName: string | null;
  datum: string;
  taetigkeitenKatalog: string[];
}): string {
  const baustellenList = context.baustellen
    .map((b) => `- ID: "${b.id}", Name: "${b.name}"`)
    .join('\n');

  const katalog =
    context.taetigkeitenKatalog.length > 0
      ? context.taetigkeitenKatalog.join(', ')
      : 'noch leer';

  return `Du bist ein Zeiterfassungs-Assistent fuer Dachdecker und Zimmerer auf Baustellen.

DEINE AUFGABE: Extrahiere strukturierte Zeiterfassungsdaten aus freien Sprachbeschreibungen.

KONTEXT:
- Heutiges Datum: ${context.datum}
- Standard-Baustelle: ${context.defaultBaustelleName ?? 'keine'}${context.defaultBaustelleId ? ` (ID: ${context.defaultBaustelleId})` : ''}

VERFUEGBARE BAUSTELLEN:
${baustellenList || 'keine'}

BEKANNTE TAETIGKEITEN: ${katalog}

REGELN:
1. Wenn keine Baustelle erwaehnt wird, nimm die Standard-Baustelle.
2. Wenn nur Stundenzahl genannt wird (z.B. "10 Stunden gearbeitet"), berechne: von="07:00", bis=von+stunden+pause. Standard-Pause ist 30 Minuten wenn nicht anders gesagt.
3. Wenn Pause explizit genannt wird (z.B. "45 Minuten Pause", "eine Stunde Pause", "keine Pause"), nutze diesen Wert. Fuege eine separate Pause-Taetigkeit hinzu mit negativen Stunden.
4. Wenn weder Zeiten noch Stunden erwaehnt werden, setze complete=false und frage nach.
5. Wenn "ganzer Tag" oder "den ganzen Tag" erwaehnt wird, setze von="07:00", bis="16:00".
6. Materialien sind optional -- wenn keine erwaehnt, ist das OK (complete kann trotzdem true sein).
7. Einheiten fuer Material: "Stk" (Stueck), "m" (Meter), "m2" (Quadratmeter), "VE" (Verpackungseinheit), "ohne".
8. Bei unklaren Baustellen-Namen, matche fuzzy gegen die Liste.
9. Stunden muessen nicht explizit gesagt werden -- berechne sie aus von/bis minus Pause.
10. Pause als eigene Taetigkeit mit beschreibung="Pause" und negativen Stunden eintragen (z.B. -0.5 fuer 30min, -0.75 fuer 45min, -1.0 fuer 60min). Bei "keine Pause" keine Pause-Taetigkeit.
11. MEHRERE TAETIGKEITEN: Wenn der User mehrere Taetigkeiten aufzaehlt (mit Spiegelstrichen, Nummern, oder "und dann"), erfasse ALLE als separate Eintraege im taetigkeiten-Array. Jede Taetigkeit behaelt den vollen Beschreibungstext.
12. ZULAGEN: Begriffe wie "Zulage", "Zulage Daemmebene" etc. sind eigene Taetigkeiten -- erfasse sie als separate Eintraege mit dem vollen Text.
13. BAUTEIL-REFERENZEN: Texte wie "104 N:", "101 O:", "(NO-N10.5)", "(O2-SO)" sind Bauteil-/Achsreferenzen und gehoeren zur Beschreibung dazu. Nicht abschneiden.
14. Wenn mehrere Positionen beschrieben werden aber nur eine Gesamtzeit, verteile die Stunden gleichmaessig auf alle Taetigkeiten.

ANTWORTE AUSSCHLIESSLICH mit validem JSON in diesem Format:
{
  "complete": true,
  "entry": {
    "baustelleId": "abc123",
    "baustelleName": "Dachsanierung Goethestr.",
    "von": "07:00",
    "bis": "16:00",
    "taetigkeiten": [
      {"beschreibung": "104 N: Mauerlatte 10/14 (NO-N10.5) angepasst und eingesetzt, inkl. Allujet und Attika", "stunden": null},
      {"beschreibung": "101 O: Mauerlatte 10/14 (NO-N2) angepasst und eingesetzt, Mauerlatten zugeschnitten inkl. Borsalzbehandlung", "stunden": null},
      {"beschreibung": "Zulage: Geruest gesaeubert und abgeraeumt", "stunden": null},
      {"beschreibung": "Zulage Daemmebene: Dampfbremse Dasatop ans Mauerwerk angeschlossen und montiert (N13-O2)", "stunden": null}
    ],
    "materialien": [{"bezeichnung": "Mauerlatte 10/14", "menge": 2, "einheit": "Stk", "taetigkeitIndex": 0}]
  },
  "followUpQuestion": null,
  "newTaetigkeiten": ["Mauerlatte angepasst und eingesetzt", "Geruest gesaeubert und abgeraeumt"],
  "newMaterialien": ["Mauerlatte 10/14"]
}

Wenn Daten fehlen (z.B. keine Zeiten), setze "complete": false und stelle eine kurze, freundliche Frage in "followUpQuestion". Beispiel: "Von wann bis wann hast du heute gearbeitet?"

WICHTIG: Antworte NUR mit JSON, kein anderer Text.`;
}

export async function parseZeiteintrag(
  userText: string,
  context: {
    baustellen: { id: string; name: string }[];
    defaultBaustelleId: string | null;
    defaultBaustelleName: string | null;
    datum: string;
    taetigkeitenKatalog: string[];
  },
  previousMessages?: ChatMessage[],
): Promise<ParsedZeiteintrag> {
  const systemPrompt = buildSystemPrompt(context);

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...(previousMessages ?? []),
    { role: 'user', content: userText },
  ];

  const raw = await sendChatCompletion(messages);

  // Extract JSON from response -- LLMs sometimes add extra text or broken JSON
  let jsonStr = raw.trim();

  // Strip markdown code blocks
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  // Find the outermost { ... } if there's extra text around it
  const braceStart = jsonStr.indexOf('{');
  const braceEnd = jsonStr.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    jsonStr = jsonStr.slice(braceStart, braceEnd + 1);
  }

  // Fix common LLM JSON errors:
  // - Trailing commas before } or ]
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');
  // - Single quotes instead of double quotes (crude but helps)
  // - Comments (// ...)
  jsonStr = jsonStr.replace(/\/\/[^\n]*/g, '');

  try {
    return JSON.parse(jsonStr) as ParsedZeiteintrag;
  } catch (parseError) {
    console.error('LLM returned invalid JSON:', raw);
    // Return a fallback that asks the user to try again
    return {
      complete: false,
      entry: {
        baustelleId: null,
        baustelleName: null,
        von: '',
        bis: '',
        taetigkeiten: [],
        materialien: [],
      },
      followUpQuestion: 'Ich konnte deine Eingabe nicht verarbeiten. Bitte nochmal versuchen.',
      newTaetigkeiten: [],
      newMaterialien: [],
    };
  }
}
