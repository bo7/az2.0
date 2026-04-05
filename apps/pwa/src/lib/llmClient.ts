// LLM API client -- calls OpenAI-compatible endpoint (mlx_lm.server on mac2)

const LLM_API_URL = import.meta.env.VITE_LLM_API_URL ?? 'http://10.200.0.12:8899';
// NOTE: Always use WireGuard address (10.200.0.x), never 0.0.0.0

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

export async function sendChatCompletion(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const response = await fetch(`${LLM_API_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: import.meta.env.VITE_LLM_MODEL ?? 'mlx-community/Llama-3.1-Nemotron-70B-Instruct-HF-8bit',
      messages,
      temperature: options?.temperature ?? 0.1,
      max_tokens: options?.maxTokens ?? 1024,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM API error: ${response.status}`);
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
2. Wenn keine Zeiten erwaehnt werden, setze complete=false und frage nach.
3. Wenn "ganzer Tag" oder "den ganzen Tag" erwaehnt wird, setze von="07:00", bis="16:00".
4. Materialien sind optional -- wenn keine erwaehnt, ist das OK (complete kann trotzdem true sein).
5. Einheiten fuer Material: "Stk" (Stueck), "m" (Meter), "m2" (Quadratmeter), "VE" (Verpackungseinheit), "ohne".
6. Bei unklaren Baustellen-Namen, matche fuzzy gegen die Liste.
7. Stunden muessen nicht explizit gesagt werden -- berechne sie aus von/bis.

ANTWORTE AUSSCHLIESSLICH mit validem JSON in diesem Format:
{
  "complete": true,
  "entry": {
    "baustelleId": "abc123",
    "baustelleName": "Dachsanierung Goethestr.",
    "von": "07:00",
    "bis": "16:00",
    "taetigkeiten": [{"beschreibung": "Dachlatten zugeschnitten und befestigt", "stunden": null}],
    "materialien": [{"bezeichnung": "Dachlatten", "menge": 30, "einheit": "m", "taetigkeitIndex": 0}]
  },
  "followUpQuestion": null,
  "newTaetigkeiten": ["Dachlatten zugeschnitten und befestigt"],
  "newMaterialien": ["Dachlatten"]
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
