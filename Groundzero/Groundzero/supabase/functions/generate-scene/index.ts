import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ... keep existing code (SceneGenerationRequest interface)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try { await requireAuth(req); } catch (e) { if (e instanceof Response) return e; throw e; }
    const request: SceneGenerationRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { beatId, beatName, beatDescription, framework, projectContext, suggestionType } = request;

    // Build context from existing scenes
    const existingScenesSummary = projectContext.existingScenes
      .map(s => `Scene ${s.scene_number}: ${s.slugline || 'Untitled'} - ${s.description?.substring(0, 100) || 'No description'}`)
      .join('\n');

    const frameworkGuides: Record<string, string> = {
      'save_the_cat': `Save the Cat! by Blake Snyder emphasizes:
- Opening/Final Image contrast shows transformation
- Catalyst (page 12) disrupts protagonist's world  
- Debate section shows reluctance before commitment
- Fun & Games delivers the "promise of the premise"
- Midpoint is a "false victory" or "false defeat"
- All Is Lost includes a "whiff of death"
- Dark Night of the Soul is introspection before breakthrough
- Finale synthesizes A and B stories`,

      'hero_journey': `Hero's Journey by Joseph Campbell/Chris Vogler:
- Ordinary World establishes normal before change
- Call to Adventure presents the challenge
- Refusal of the Call shows fear and hesitation
- Meeting the Mentor provides guidance/gifts
- Crossing the Threshold commits to the journey
- Tests/Allies/Enemies builds the new world
- Ordeal is the central crisis
- Reward follows the ordeal
- Return with the Elixir transforms the hero`,

      'sequence_method': `Sequence Method by Frank Daniel:
- 8 sequences of 12-15 pages each
- Each sequence has its own tension arc and mini-climax
- Clear cause-and-effect between sequences
- Focus on escalation and payoff`,

      'seven_point': `Seven-Point Structure by Dan Wells:
- Hook is opposite of resolution
- Plot Point 1 launches the story
- Pinch Points apply pressure from antagonist
- Midpoint shifts from reaction to action
- Plot Point 2 provides final tool for climax
- Resolution completes the transformation`
    };

    const systemPrompt = `You are a professional screenwriter and story consultant. Your task is to write a complete, production-ready scene that fulfills a specific story beat based on the selected narrative framework.

FRAMEWORK GUIDELINES:
${frameworkGuides[framework] || 'Use standard dramatic structure principles.'}

WRITING REQUIREMENTS:
1. Write a complete scene with proper screenplay formatting elements
2. Include a clear slugline (INT./EXT. LOCATION - TIME)
3. Write detailed action/description lines
4. Include dialogue if appropriate for the beat
5. Ensure the scene naturally fits with existing scenes
6. Use existing characters when possible, or introduce new ones purposefully
7. The scene should clearly embody the "${beatName}" beat: ${beatDescription}

OUTPUT FORMAT:
Return a JSON object with:
{
  "slugline": "INT./EXT. LOCATION - TIME",
  "description": "Detailed scene description (2-4 paragraphs)",
  "dialogue_excerpts": ["Key dialogue lines if any"],
  "characters": ["Character names in scene"],
  "location": "Specific location",
  "time_of_day": "DAY/NIGHT/DAWN/DUSK",
  "props": ["Notable props mentioned"],
  "emotional_beat": "The core emotional moment",
  "placement_suggestion": "Where this scene should go in the story",
  "estimated_page_count": 2,
  "director_notes": "Brief notes for the director about tone and intention"
}`;

    const userPrompt = `PROJECT: "${projectContext.title}"
GENRE: ${projectContext.genre || 'Drama'}
DESCRIPTION: ${projectContext.description || 'No description provided'}

EXISTING CHARACTERS: ${projectContext.characters.join(', ') || 'None established yet'}

EXISTING SCENES:
${existingScenesSummary || 'No scenes exist yet'}

TASK: Write a scene for the "${beatName}" beat (${beatId})
BEAT DESCRIPTION: ${beatDescription}
FRAMEWORK: ${framework.replace('_', ' ').toUpperCase()}
SUGGESTION TYPE: ${suggestionType}

Generate a complete, compelling scene that fulfills this story beat while maintaining consistency with the established story elements.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from AI');
    }

    // Parse the JSON response
    let sceneData;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1] || content;
      sceneData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      // Create a fallback structure from raw content
      sceneData = {
        slugline: `INT. LOCATION - DAY`,
        description: content,
        dialogue_excerpts: [],
        characters: projectContext.characters.slice(0, 3),
        location: 'To be determined',
        time_of_day: 'DAY',
        props: [],
        emotional_beat: beatDescription,
        placement_suggestion: 'Review and place appropriately',
        estimated_page_count: 2,
        director_notes: 'Generated scene - review and refine as needed'
      };
    }

    return new Response(JSON.stringify({
      success: true,
      scene: sceneData,
      beatId,
      beatName,
      framework
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Scene generation error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
