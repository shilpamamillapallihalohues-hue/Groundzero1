import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `You are a screenplay formatting expert. Convert ANY input text into a perfectly structured screenplay with INDIVIDUAL elements — one per line. NEVER group text into paragraphs. Each element is a SINGLE line.

CRITICAL RULES:
- EVERY element must be its OWN separate JSON object
- Action lines: MAX 2 sentences per element. If longer, split into multiple "action" elements
- Dialogue: Each speech is its own "dialogue" element — never combine multiple sentences into one unless they form a single short utterance
- ALWAYS produce scene_heading elements. If none exist in the text, CREATE them based on context (e.g. "INT. LOCATION - DAY")
- Transitions like "CUT TO:", "FADE IN:", "DISSOLVE TO:" must be their own elements
- Camera directions like "CLOSE UP", "WIDE SHOT", "INSERT" must be their own "shot" elements
- Act breaks, title cards, production notes → "note" elements

SCREENPLAY ELEMENT TYPES AND FORMAT:

1. scene_heading — ALL CAPS. Format: "INT./EXT. LOCATION - TIME". Always starts a new scene.
2. action — Present tense. Describes what we SEE. Short (1-2 sentences max). Character names CAPITALIZED on first appearance.
3. character — ALL CAPS character name only. Add (V.O.), (O.S.), (CONT'D) as needed. Field character_name must match.
4. parenthetical — Brief acting direction in parentheses: "(whispering)", "(to John)", "(beat)". Only when essential.
5. dialogue — The character's spoken words. Normal case. One speech unit per element.
6. transition — ALL CAPS: "CUT TO:", "FADE IN:", "DISSOLVE TO:", "SMASH CUT TO:"
7. shot — ALL CAPS camera direction: "CLOSE UP - THE RING", "WIDE SHOT - THE BATTLEFIELD", "ANGLE ON - THE DOOR"
8. note — Act breaks, title cards, writer notes. Italic/meta content.

STRUCTURE PATTERN (repeat for each beat):
  transition (optional)
  scene_heading
  action (1-2 sentences)
  action (next 1-2 sentences if needed)
  shot (if cinematically important)
  character
  parenthetical (optional)
  dialogue
  action (reaction)
  character
  dialogue
  ...

EXAMPLE OUTPUT:
[
  {"type":"transition","content":"FADE IN:"},
  {"type":"scene_heading","content":"INT. SARAH'S APARTMENT - MORNING"},
  {"type":"action","content":"Sunlight filters through dusty blinds. The apartment is small, cluttered with books."},
  {"type":"action","content":"A coffee cup sits cold on the nightstand."},
  {"type":"action","content":"SARAH (30s, sharp eyes, paint-stained fingers) jolts awake from a nightmare."},
  {"type":"character","content":"SARAH","character_name":"SARAH"},
  {"type":"parenthetical","content":"(catching her breath)"},
  {"type":"dialogue","content":"Not again."},
  {"type":"action","content":"She reaches for the coffee, takes a sip, grimaces."},
  {"type":"shot","content":"CLOSE UP - SARAH'S HAND TREMBLING"},
  {"type":"character","content":"SARAH (CONT'D)","character_name":"SARAH"},
  {"type":"dialogue","content":"I need to get out of here."},
  {"type":"transition","content":"CUT TO:"},
  {"type":"scene_heading","content":"EXT. CITY STREET - DAY"},
  {"type":"action","content":"Rain-soaked pavement. Pedestrians hurry past with umbrellas."},
  {"type":"action","content":"Sarah emerges from her building, squinting at the grey sky."}
]

Return ONLY the JSON array. No markdown, no explanation.`;

function extractJsonFromResponse(response: string): unknown {
  let cleaned = response
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  const jsonStart = cleaned.indexOf('[');
  const jsonEnd = cleaned.lastIndexOf(']');

  if (jsonStart === -1 || jsonEnd === -1) {
    // Try object format
    const objStart = cleaned.indexOf('{');
    const objEnd = cleaned.lastIndexOf('}');
    if (objStart !== -1 && objEnd !== -1) {
      cleaned = cleaned.substring(objStart, objEnd + 1);
      // Wrap in array if single object
      try { 
        const obj = JSON.parse(cleaned);
        return Array.isArray(obj) ? obj : [obj];
      } catch { /* fall through */ }
    }
    throw new Error('No JSON array found in response');
  }

  cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

  try {
    return JSON.parse(cleaned);
  } catch {
    // Fix common JSON issues
    cleaned = cleaned
      .replace(/,\s*]/g, ']')
      .replace(/,\s*}/g, '}')
      .replace(/[\x00-\x1F\x7F]/g, '')
      .replace(/\n/g, '\\n');

    try {
      return JSON.parse(cleaned);
    } catch {
      // Try to recover truncated response
      const lastComplete = cleaned.lastIndexOf('}');
      if (lastComplete > 0) {
        const repaired = cleaned.substring(0, lastComplete + 1) + ']';
        try {
          return JSON.parse(repaired);
        } catch { /* fall through */ }
      }
      throw new Error('Failed to parse JSON from AI response');
    }
  }
}

function splitIntoChunks(text: string, maxChunkSize: number): string[] {
  if (text.length <= maxChunkSize) return [text];

  const chunks: string[] = [];
  const lines = text.split('\n');
  let currentChunk = '';

  // Try to split on scene boundaries first (lines with SCENE, INT., EXT., CUT TO, etc.)
  const sceneBreakPattern = /^(SCENE\s+\d|INT\.|EXT\.|CUT\s+TO|FADE\s+(IN|OUT)|ACT\s+[IVX\d])/i;

  for (const line of lines) {
    const wouldExceed = (currentChunk + '\n' + line).length > maxChunkSize;

    if (wouldExceed && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = line;
    } else if (currentChunk.length > maxChunkSize * 0.7 && sceneBreakPattern.test(line.trim())) {
      // Natural scene break point
      chunks.push(currentChunk.trim());
      currentChunk = line;
    } else {
      currentChunk += (currentChunk ? '\n' : '') + line;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

async function formatChunk(content: string, apiKey: string, chunkIndex: number, totalChunks: number): Promise<any[]> {
  const contextNote = totalChunks > 1
    ? `\n\nNOTE: This is chunk ${chunkIndex + 1} of ${totalChunks} of a larger script. Format this section independently. Do NOT add opening/closing transitions unless they exist in the text.`
    : '';

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Convert this into a properly formatted screenplay with INDIVIDUAL elements per line. Break all long paragraphs into separate short action lines. Add scene headings, character names, dialogue, shots, transitions, and notes as needed:${contextNote}\n\n${content}` }
      ],
      temperature: 0.3,
      max_tokens: 16000,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error('Rate limit exceeded. Please try again in a moment.');
    if (response.status === 402) throw new Error('AI credits exhausted. Please add credits.');
    const errorText = await response.text();
    console.error(`AI API error for chunk ${chunkIndex + 1}:`, errorText);
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || '';

  if (!raw.trim()) {
    console.error(`Empty response for chunk ${chunkIndex + 1}`);
    throw new Error(`Empty AI response for chunk ${chunkIndex + 1}`);
  }

  const elements = extractJsonFromResponse(raw) as any[];

  if (!Array.isArray(elements)) {
    throw new Error(`Invalid response format from AI for chunk ${chunkIndex + 1}`);
  }

  console.log(`Chunk ${chunkIndex + 1}/${totalChunks}: parsed ${elements.length} elements`);
  return elements;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try { await requireAuth(req); } catch (e) { if (e instanceof Response) return e; throw e; }
    const { content } = await req.json();

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'No content provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`Processing script: ${content.length} characters`);

    // Split large scripts into chunks (~4000 chars each for reliable processing)
    const MAX_CHUNK_SIZE = 4000;
    const chunks = splitIntoChunks(content, MAX_CHUNK_SIZE);
    console.log(`Split into ${chunks.length} chunk(s)`);

    let allElements: any[] = [];

    // Process chunks sequentially to avoid rate limits
    for (let i = 0; i < chunks.length; i++) {
      try {
        const chunkElements = await formatChunk(chunks[i], LOVABLE_API_KEY, i, chunks.length);
        allElements.push(...chunkElements);
      } catch (chunkError) {
        console.error(`Error processing chunk ${i + 1}:`, chunkError);
        // If a chunk fails, add the raw text as action elements rather than failing entirely
        const fallbackLines = chunks[i].split('\n').filter(l => l.trim());
        for (const line of fallbackLines) {
          allElements.push({
            type: 'action',
            content: line.trim(),
          });
        }
        console.log(`Chunk ${i + 1} fell back to raw lines (${fallbackLines.length} lines)`);
      }
    }

    console.log(`Total formatted elements: ${allElements.length}`);

    return new Response(JSON.stringify({
      success: true,
      elements: allElements.map((el: any, idx: number) => ({
        id: crypto.randomUUID(),
        element_type: el.type || 'action',
        content: el.content || '',
        order_index: idx,
        character_name: el.character_name || undefined,
      })),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in format-script:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
