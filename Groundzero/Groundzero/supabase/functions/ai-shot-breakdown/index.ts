import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ShotBreakdownRequest {
  sceneId: string;
  sceneNumber: string;
  slugline: string;
  description: string;
  characters?: string[];
  location?: string;
  timeOfDay?: string;
}

interface GeneratedShot {
  shot_number: string;
  action: string;
  shot_type: string;
  camera_angle: string;
  duration_seconds: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    try { await requireAuth(req); } catch (e) { if (e instanceof Response) return e; throw e; }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const requestData: ShotBreakdownRequest = await req.json();
    console.log('AI Shot Breakdown for scene:', requestData.sceneNumber, requestData.slugline);

    if (!requestData.sceneId || !requestData.description) {
      return new Response(
        JSON.stringify({ error: 'Scene ID and description are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the prompt for AI shot breakdown
    const prompt = `You are a professional film storyboard supervisor. Analyze this scene and break it down into individual shots.

SCENE INFORMATION:
- Scene Number: ${requestData.sceneNumber}
- Slugline: ${requestData.slugline}
- Location: ${requestData.location || 'Not specified'}
- Time of Day: ${requestData.timeOfDay || 'Day'}
- Characters: ${requestData.characters?.join(', ') || 'Not specified'}

SCENE DESCRIPTION:
${requestData.description}

TASK: Break this scene into 3-8 shots that would effectively tell this part of the story visually. For each shot, provide:
1. A brief action description (what happens in the shot)
2. Suggested shot type (wide shot, medium shot, close-up, extreme close-up, over-the-shoulder, etc.)
3. Camera angle (eye level, low angle, high angle, dutch angle, bird's eye, etc.)
4. Estimated duration in seconds (2-15 seconds typical)

IMPORTANT GUIDELINES:
- Start with an establishing shot if it's a new location
- Use variety in shot types to maintain visual interest
- Consider the emotional beats of the scene
- Include reaction shots where appropriate
- End with a shot that transitions well to the next scene

Respond ONLY with a valid JSON object containing an array of shots. Example format:
{
  "shots": [
    {
      "shot_number": "1",
      "action": "Establishing shot of the cityscape at dawn",
      "shot_type": "wide shot",
      "camera_angle": "high angle",
      "duration_seconds": 4
    }
  ]
}`;

    console.log('Calling Lovable AI Gateway for shot breakdown...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI usage limit reached. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI service unavailable', details: errorText }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ error: 'No analysis generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI response received, parsing...');

    let shots: GeneratedShot[] = [];
    
    // Parse AI response
    try {
      const parsedResult = JSON.parse(content);
      shots = parsedResult.shots || parsedResult;
      console.log(`Parsed ${shots.length} shots from AI response`);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.log('Raw AI response:', content);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response', details: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!Array.isArray(shots) || shots.length === 0) {
      return new Response(
        JSON.stringify({ error: 'AI did not generate valid shots' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get existing shot count for this scene
    const { data: existingShots } = await supabase
      .from('storyboards')
      .select('shot_number')
      .eq('scene_id', requestData.sceneId);
    
    const startingNumber = (existingShots?.length || 0) + 1;

    // Insert shots into storyboards table
    const shotsToInsert = shots.map((shot, index) => ({
      scene_id: requestData.sceneId,
      shot_number: String(startingNumber + index),
      action: shot.action,
      shot_type: shot.shot_type,
      camera_angle: shot.camera_angle,
      status: 'pending',
    }));

    const { data: insertedShots, error: insertError } = await supabase
      .from('storyboards')
      .insert(shotsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting shots:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save shots to database', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully created ${insertedShots?.length || 0} shots`);

    return new Response(
      JSON.stringify({
        success: true,
        shots: insertedShots,
        message: `Created ${insertedShots?.length || 0} shots for scene ${requestData.sceneNumber}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('AI Shot Breakdown error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
