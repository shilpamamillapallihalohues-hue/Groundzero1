import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try { await requireAuth(req); } catch (e) { if (e instanceof Response) return e; throw e; }
    const { scene, projectTitle, allScenes } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const contextScenes = (allScenes || []).map((s: any) =>
      `Scene ${s.scene_number}: "${s.slugline}" — Characters: ${(s.characters || []).join(', ') || 'N/A'}`
    ).join('\n');

    const systemPrompt = `You are an expert screenplay analyst. Analyze the following individual scene from the project "${projectTitle || 'Untitled'}".

SCENE TO ANALYZE:
- Scene Number: ${scene.scene_number}
- Slugline: ${scene.slugline || 'N/A'}
- Description: ${scene.description || 'N/A'}
- Characters: ${(scene.characters || []).join(', ') || 'N/A'}
- Props: ${(scene.props || []).join(', ') || 'N/A'}
- Location: ${scene.location || 'N/A'}
- Time of Day: ${scene.time_of_day || 'N/A'}

FULL SCREENPLAY CONTEXT (all scenes):
${contextScenes}

Provide a thorough analysis of this single scene. Return JSON:
{
  "analysis": {
    "pacing": "2-3 sentence analysis of scene pacing — is it too fast, too slow, well-balanced?",
    "pacingScore": 75,
    "emotionalArc": "2-3 sentences on the emotional journey within this scene",
    "characterDynamics": "2-3 sentences on how characters interact and develop",
    "dialogueBalance": "1-2 sentences on dialogue vs action balance",
    "visualPotential": "1-2 sentences on the cinematic/visual opportunities",
    "strengths": ["Strength 1", "Strength 2", "Strength 3"],
    "weaknesses": ["Weakness 1", "Weakness 2"],
    "suggestions": ["Specific actionable suggestion 1", "Suggestion 2", "Suggestion 3"],
    "overallScore": 78
  }
}

SCORING:
- overallScore: 0-100 overall scene quality
- pacingScore: 0-100 pacing quality
- Be honest and constructive. Don't inflate scores.
- Strengths should be specific to this scene
- Weaknesses should be actionable
- Suggestions should be concrete rewrites or additions`;

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
          { role: "user", content: `Analyze Scene ${scene.scene_number}: "${scene.slugline}" in detail.` }
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI error:", response.status, errorText);
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1].trim());
      } else {
        throw new Error('Failed to parse AI response');
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-scene:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});