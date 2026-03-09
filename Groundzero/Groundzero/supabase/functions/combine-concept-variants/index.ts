import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ... keep existing code (VariantSelection, CombineRequest interfaces)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try { await requireAuth(req); } catch (e) { if (e instanceof Response) return e; throw e; }
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const request: CombineRequest = await req.json();
    const { projectId, conceptType, artStyle, selections, basePrompt, title } = request;

    if (!selections || selections.length < 2) {
      throw new Error('At least 2 variant selections are required');
    }

    // Build a comprehensive prompt that describes combining elements
    const elementDescriptions = selections.map((s, i) => 
      `From Image ${i + 1}: ${s.element} - ${s.description}`
    ).join('\n');

    const combinePrompt = `
Create a new character/concept image that combines specific elements from the provided reference images.

Elements to combine:
${elementDescriptions}

Additional context:
- Concept Type: ${conceptType}
- Art Style: ${artStyle}
${basePrompt ? `- Base description: ${basePrompt}` : ''}

Important instructions:
- Maintain visual consistency and coherent proportions
- The combined result should look natural and unified
- Keep the same overall art style throughout
- Preserve the quality and detail level from the source images
`.trim();

    // Build the messages with multiple images
    const imageContents = selections.map((s) => ({
      type: "image_url" as const,
      image_url: {
        url: s.imageUrl
      }
    }));

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: combinePrompt
              },
              ...imageContents
            ]
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const data = await response.json();
    const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textResponse = data.choices?.[0]?.message?.content || '';

    if (!generatedImage) {
      throw new Error('No image was generated');
    }

    // Upload to Supabase storage
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Convert base64 to blob
    const base64Data = generatedImage.replace(/^data:image\/\w+;base64,/, '');
    const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    const fileName = `combined/${projectId}/${Date.now()}-combined.png`;
    const { error: uploadError } = await supabase.storage
      .from('reference-images')
      .upload(fileName, imageBytes, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Failed to save combined image');
    }

    const { data: { publicUrl } } = supabase.storage
      .from('reference-images')
      .getPublicUrl(fileName);

    // Save to concept_arts table
    const { data: conceptData, error: conceptError } = await supabase
      .from('concept_arts')
      .insert({
        project_id: projectId,
        title: title || 'Combined Variant',
        concept_type: conceptType,
        art_style: artStyle,
        image_url: publicUrl,
        status: 'generated',
        generated_prompt: combinePrompt,
        metadata: {
          combinedFrom: selections.map(s => ({
            element: s.element,
            description: s.description
          })),
          isCombinedVariant: true,
          generatedAt: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (conceptError) {
      console.error('Concept save error:', conceptError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: publicUrl,
        conceptId: conceptData?.id,
        message: textResponse,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to combine variants';
    console.error('Combine variants error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
