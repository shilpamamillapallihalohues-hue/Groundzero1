import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { sceneId, projectId } = await req.json();

    if (!sceneId) {
      return new Response(
        JSON.stringify({ error: 'sceneId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch scene data
    const { data: scene, error: sceneError } = await supabase
      .from('scenes')
      .select('*')
      .eq('id', sceneId)
      .single();

    if (sceneError || !scene) {
      return new Response(
        JSON.stringify({ error: 'Scene not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch approved concept arts for this project to inform consistency
    let conceptArts: any[] = [];
    if (projectId) {
      const { data: concepts } = await supabase
        .from('concept_arts')
        .select('title, concept_type, description, art_style, tags')
        .eq('project_id', projectId)
        .eq('is_approved', true)
        .limit(20);
      conceptArts = concepts || [];
    }

    // Fetch creative context rules for lore grounding
    let loreRules: any[] = [];
    if (projectId) {
      const { data: rules } = await supabase
        .from('creative_context_rules')
        .select('category, entity_name, rule_text')
        .eq('project_id', projectId)
        .eq('is_approved', true)
        .limit(30);
      loreRules = rules || [];
    }

    const conceptContext = conceptArts.length > 0
      ? `\n\nAPPROVED CONCEPT ART (use these designs for visual consistency):\n${conceptArts.map(c => `- ${c.title} (${c.concept_type}): ${c.description || 'No description'}`).join('\n')}`
      : '';

    const loreContext = loreRules.length > 0
      ? `\n\nPROJECT LORE & CANON:\n${loreRules.map(r => `- [${r.category}] ${r.entity_name}: ${r.rule_text}`).join('\n')}`
      : '';

    const prompt = `You are an expert AI cinematographer and storyboard supervisor for a professional film production.

Analyze this scene deeply and provide a comprehensive Scene Intelligence report.

SCENE DATA:
- Scene Number: ${scene.scene_number}
- Title/Slugline: ${scene.slugline || 'Untitled'}
- Description: ${scene.description || 'No description provided'}
- Location: ${scene.location || 'Not specified'}
- Time of Day: ${scene.time_of_day || 'Day'}
- Mood: ${scene.mood || 'Not specified'}
- Characters: ${scene.characters || 'Not specified'}
${conceptContext}${loreContext}

TASK: Provide a complete scene intelligence analysis with the following structure:

1. SCENE ANALYSIS: Extract key elements (characters, props, environment, actions, emotional tone)
2. CINEMATOGRAPHY PLAN: Suggest 4-8 shots that tell this scene visually, with specific camera/lighting/lens for each
3. For each shot, consider:
   - Conversations → medium shots, over-shoulder
   - Action sequences → wide/tracking shots
   - Emotional moments → close-ups
   - Dramatic reveals → reveal shots with dramatic lighting
   - Scene openings → establishing wide shots

Return ONLY a valid JSON object with this exact structure:
{
  "analysis": {
    "characters": ["Character Name 1", "Character Name 2"],
    "props": ["prop1", "prop2"],
    "environment": "Description of the setting",
    "key_actions": ["action1", "action2"],
    "emotional_tone": "The dominant emotional quality",
    "visual_themes": ["theme1", "theme2"]
  },
  "shots": [
    {
      "shot_number": 1,
      "description": "What happens in this shot",
      "camera_angle": "Wide Shot",
      "lens": "24mm",
      "lighting": "Natural Light",
      "duration_seconds": 4,
      "rationale": "Why this shot works here"
    }
  ]
}

CAMERA ANGLES: Wide Shot, Medium Shot, Close Up, Over Shoulder, POV, Tracking Shot, Low Angle, High Angle, Dutch Angle, Bird Eye
LENS OPTIONS: 24mm, 35mm, 50mm, 85mm, 100mm macro
LIGHTING OPTIONS: Natural Light, Cinematic Soft Light, High Contrast, Dramatic Lighting, Night Lighting, Golden Hour, Mystical Glow, Silhouette`;

    console.log('Scene Intelligence analysis for scene:', scene.scene_number);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI usage limit reached. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: 'AI service unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ error: 'No analysis generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let result;
    try {
      result = JSON.parse(content);
    } catch {
      console.error('Failed to parse AI response:', content);
      return new Response(JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Scene Intelligence complete: ${result.shots?.length || 0} shots suggested`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Scene Intelligence error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
