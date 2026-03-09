import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EditRequest {
  sourceImageUrl: string;
  targetAngle: string;
  characterName: string;
  skinTone?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try { await requireAuth(req); } catch (e) { if (e instanceof Response) return e; throw e; }
    const { sourceImageUrl, targetAngle, characterName, skinTone } = await req.json() as EditRequest;

    if (!sourceImageUrl) {
      throw new Error('Source image URL is required');
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build very specific angle transformation prompts
    // The key is to describe EXACTLY what rotation to apply while preserving identity
    const angleTransforms: Record<string, { rotation: string; visible: string; instruction: string }> = {
      'front': {
        rotation: '0 degrees - facing camera directly',
        visible: 'Both eyes equally visible, nose centered, symmetrical face',
        instruction: 'Keep the face exactly as is, facing forward'
      },
      'three_quarter_left': {
        rotation: '45 degrees left rotation',
        visible: 'Right eye fully visible, left eye partially hidden, nose pointing left, slight view of left ear',
        instruction: 'Rotate this exact same bald head 45 degrees to the LEFT. Show three-quarter left view. Keep the EXACT same skin, pores, features.'
      },
      'three_quarter_right': {
        rotation: '45 degrees right rotation',
        visible: 'Left eye fully visible, right eye partially hidden, nose pointing right, slight view of right ear',
        instruction: 'Rotate this exact same bald head 45 degrees to the RIGHT. Show three-quarter right view. Keep the EXACT same skin, pores, features.'
      },
      'side_left': {
        rotation: '90 degrees left - full left profile',
        visible: 'Only left side visible, left ear fully shown, nose profile pointing left, no right facial features visible',
        instruction: 'Rotate this exact same bald head 90 degrees to show FULL LEFT PROFILE. Left ear visible, nose in profile. Same person, same skin.'
      },
      'side_right': {
        rotation: '90 degrees right - full right profile',
        visible: 'Only right side visible, right ear fully shown, nose profile pointing right, no left facial features visible',
        instruction: 'Rotate this exact same bald head 90 degrees to show FULL RIGHT PROFILE. Right ear visible, nose in profile. Same person, same skin.'
      },
      'up': {
        rotation: 'Tilt up 15-20 degrees',
        visible: 'Underside of chin visible, nostrils slightly visible, forehead receding',
        instruction: 'Tilt this exact same bald head UPWARD 15-20 degrees. Chin raised, looking up. Same person, same skin.'
      },
      'down': {
        rotation: 'Tilt down 15-20 degrees',
        visible: 'Top of scalp prominent, eyes looking down, chin tucked',
        instruction: 'Tilt this exact same bald head DOWNWARD 15-20 degrees. Chin lowered, looking down. Same person, same skin.'
      },
    };

    const transform = angleTransforms[targetAngle] || angleTransforms['front'];
    const skinDesc = skinTone || 'the exact same skin tone';

    // Use Lovable AI image editing with the Gemini image model
    const editPrompt = `${transform.instruction}

CRITICAL IDENTITY PRESERVATION RULES:
- This is the EXACT SAME person - do NOT change their identity
- Maintain EXACT same skin tone: ${skinDesc}
- Maintain EXACT same skin texture, pores, and wrinkles
- Maintain EXACT same facial bone structure
- The head must remain COMPLETELY BALD - no hair whatsoever
- Keep the EXACT same neutral gray studio background
- Keep the EXACT same soft studio lighting

ANGLE REQUIREMENTS:
- Head rotation: ${transform.rotation}
- What should be visible: ${transform.visible}

OUTPUT: Single bald head at the specified angle. Photo-realistic 3D modeling reference quality.

DO NOT:
- Change the person's identity or face shape
- Add any hair, stubble, or hairline
- Add any markings, jewelry, or decorations
- Show multiple angles or create a collage
- Change the lighting or background`;

    console.log('Calling Lovable AI for angle:', targetAngle);
    console.log('Using image editing with identity preservation');

    // Call Lovable AI Gateway with image editing
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: editPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: sourceImageUrl
                }
              }
            ]
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`Lovable AI error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Lovable AI response received');

    // Extract the generated image URL from the response
    const message = result.choices?.[0]?.message;
    let imageUrl = null;

    // Check for images array in the response
    if (message?.images && message.images.length > 0) {
      imageUrl = message.images[0]?.image_url?.url;
    }

    if (!imageUrl) {
      console.error('No image in response:', JSON.stringify(result).substring(0, 500));
      throw new Error('No image generated from editing');
    }

    console.log('Successfully generated edited image for angle:', targetAngle);

    return new Response(JSON.stringify({
      success: true,
      imageUrl: imageUrl,
      method: 'lovable_ai_edit',
      angle: targetAngle,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edit facial turnaround error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
