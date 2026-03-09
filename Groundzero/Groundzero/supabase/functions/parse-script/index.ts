import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try { await requireAuth(req); } catch (e) { if (e instanceof Response) return e; throw e; }
    const { scriptText } = await req.json();
    
    if (!scriptText || scriptText.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Script text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an expert film script analyzer. Parse the provided screenplay/script and extract structured data.

For each scene found, extract:
- scene_number: The scene number (e.g., "1", "2A", etc.)
- slugline: The scene heading (e.g., "INT. LIVING ROOM - DAY")
- location: The location name
- time_of_day: One of "day", "night", "dawn", "dusk", or "golden_hour"
- description: A brief description of the scene action
- characters: Array of character names appearing in the scene
- props: Array of props mentioned or implied
- costumes: Array of costume descriptions if mentioned
- vfx_required: Boolean indicating if VFX is likely needed
- vfx_complexity: If VFX required, one of "low", "medium", "high", "extreme"
- sound_cues: Array of sound effects or music cues mentioned
- camera_directions: Array of camera directions if mentioned
- estimated_duration: Estimated screen time in minutes as an INTEGER (round to nearest whole number, e.g., 1, 2, 3)

Return a JSON object with:
{
  "title": "Script title if found",
  "genre": "Detected genre",
  "scenes": [array of scene objects]
}

Be thorough and extract as much detail as possible. If information is not explicitly stated, make reasonable inferences based on the context.`;

    console.log('Calling Scenecraft AI Gateway for script parsing...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Parse this screenplay and extract all scenes with their details:\n\n${scriptText}` }
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
        JSON.stringify({ error: 'Failed to analyze script' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    let parsedResult;
    try {
      parsedResult = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      parsedResult = { title: 'Untitled Script', genre: 'Unknown', scenes: [], rawContent: content };
    }

    console.log('Script parsing completed successfully');
    
    return new Response(
      JSON.stringify(parsedResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-script function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
