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
    const { imageUrl, characterName } = await req.json();

    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Preprocessing facial image - removing hair and background...');

    // Use Gemini image editing to remove hair and isolate the face
    const editPrompt = `Transform this portrait photo for 3D facial modeling reference:

CRITICAL REQUIREMENTS:
1. REMOVE ALL HAIR completely - make the head completely BALD with visible scalp
2. REMOVE the background entirely - replace with solid neutral gray (#808080)
3. KEEP the face EXACTLY the same - same skin tone, texture, features, expression
4. REMOVE any clothing/accessories from the frame - show only the head
5. MAINTAIN the exact same lighting and shadows on the face
6. Keep the image as an extreme close-up of just the head (chin to top of now-bald scalp)

The result should look like a professional 3D modeling reference sheet:
- Completely bald head showing natural scalp shape
- Isolated on neutral gray background
- Same person, same face, just without hair
- High detail facial features visible for topology reference

Character: ${characterName || 'Subject'}`;

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
              { type: 'text', text: editPrompt },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        modalities: ['image', 'text'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`Failed to preprocess image: ${response.status}`);
    }

    const result = await response.json();
    
    // Extract the processed image
    const processedImageUrl = result.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!processedImageUrl) {
      console.error('No processed image in response:', JSON.stringify(result).substring(0, 500));
      throw new Error('No processed image generated');
    }

    // Upload the processed image to storage
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Convert base64 to blob
    const base64Data = processedImageUrl.replace(/^data:image\/\w+;base64,/, '');
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const fileName = `preprocessed/facial-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from('reference-images')
      .upload(fileName, binaryData, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to save processed image: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from('reference-images')
      .getPublicUrl(fileName);

    console.log('Preprocessing complete - hair removed, background isolated');

    return new Response(JSON.stringify({
      success: true,
      originalUrl: imageUrl,
      processedUrl: publicUrlData.publicUrl,
      modifications: [
        'Hair completely removed (bald scalp)',
        'Background replaced with neutral gray',
        'Isolated head for 3D modeling reference'
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Preprocessing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
