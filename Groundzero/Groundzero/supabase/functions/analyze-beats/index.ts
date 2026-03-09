import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SceneInfo {
  id: string;
  scene_number: string;
  slugline: string | null;
  description: string | null;
  characters: string[] | null;
  props: string[] | null;
  location: string | null;
  beat_tag: string | null;
}

interface BeatInfo {
  id: string;
  name: string;
  description: string;
  pageRange: string;
  percentage: number;
  status: 'mapped' | 'partial' | 'missing';
  sceneIds: string[];
}

interface AnalyzeRequest {
  beats: BeatInfo[];
  scenes: SceneInfo[];
  structureName: string;
  projectTitle?: string;
  missingBeatId?: string; // If provided, analyze only this specific missing beat
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try { await requireAuth(req); } catch (e) { if (e instanceof Response) return e; throw e; }
    const { beats, scenes, structureName, projectTitle, missingBeatId }: AnalyzeRequest = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build a comprehensive scene summary for the AI
    const sceneSummary = scenes.map(s => {
      const parts = [`Scene ${s.scene_number}: "${s.slugline || 'Untitled'}"`];
      if (s.description) parts.push(`Description: ${s.description}`);
      if (s.characters?.length) parts.push(`Characters: ${s.characters.join(', ')}`);
      if (s.location) parts.push(`Location: ${s.location}`);
      if (s.beat_tag) parts.push(`Tagged to beat: ${s.beat_tag}`);
      return parts.join(' | ');
    }).join('\n');

    const mappedBeats = beats.filter(b => b.status === 'mapped');
    const missingBeats = missingBeatId 
      ? beats.filter(b => b.id === missingBeatId)
      : beats.filter(b => b.status === 'missing');

    const beatSummary = beats.map(b => {
      const mappedScenes = scenes.filter(s => b.sceneIds.includes(s.id));
      const sceneInfo = mappedScenes.length > 0
        ? `Mapped to: ${mappedScenes.map(s => `Scene ${s.scene_number} (${s.slugline})`).join(', ')}`
        : 'NOT MAPPED - MISSING';
      return `${b.name} (p.${b.pageRange}, ${b.percentage}%): ${b.description} → ${sceneInfo}`;
    }).join('\n');

    const systemPrompt = `You are an expert screenplay analyst and story structure specialist. You are analyzing a screenplay using the "${structureName}" beat structure framework.

PROJECT: ${projectTitle || 'Untitled Project'}

COMPLETE BEAT STRUCTURE:
${beatSummary}

ALL SCENES IN THE SCREENPLAY:
${sceneSummary}

Your task is to analyze the MISSING beats and provide detailed, actionable analysis.

For each missing beat, you MUST provide:

1. **diagnosis**: A detailed explanation (3-5 sentences) of WHY this beat is missing from the current screenplay. Reference specific scenes, characters, and narrative gaps. Explain what the story is lacking structurally because this beat is absent.

2. **impact**: How the absence of this beat affects the overall story structure, pacing, and character development.

3. **sceneSuggestions**: An array of 2-4 concrete scene suggestions that could fill this beat. Each suggestion must include:
   - "title": A slugline for the suggested scene (e.g., "INT. THRONE ROOM - NIGHT")
   - "description": A 3-5 sentence scene description with specific character actions, dialogue hints, and emotional beats
   - "characters": Array of character names that should appear (use existing characters from the screenplay when possible)
   - "location": Where the scene takes place
   - "fitScore": A score from 1-100 indicating how well this scene would fit the beat
   - "fitReason": 2-3 sentences explaining WHY this scene fits this beat position and how it connects to surrounding scenes
   - "connectsTo": Which existing scenes this would flow from/into naturally (reference by scene number)

4. **narrativePosition**: Where in the screenplay this beat should ideally appear (between which existing scenes)

Return JSON:
{
  "analyses": [
    {
      "beatId": "beat_id",
      "beatName": "Beat Name",
      "diagnosis": "Detailed explanation...",
      "impact": "Impact on story...",
      "narrativePosition": "Between Scene X and Scene Y",
      "sceneSuggestions": [
        {
          "title": "INT. LOCATION - TIME",
          "description": "Detailed scene description...",
          "characters": ["Character A", "Character B"],
          "location": "Location name",
          "fitScore": 85,
          "fitReason": "Why this fits...",
          "connectsTo": ["Scene 3", "Scene 5"]
        }
      ]
    }
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Analyze the ${missingBeats.length} missing beat(s): ${missingBeats.map(b => b.name).join(', ')}. Provide detailed diagnosis and multiple scored scene suggestions for each.`
          }
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ success: false, error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch {
      // Try extracting JSON from markdown
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[1].trim());
      } else {
        throw new Error('Failed to parse AI response');
      }
    }

    return new Response(JSON.stringify({
      success: true,
      analyses: analysis.analyses || [],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-beats:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
