import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SceneInfo {
  id: string;
  scene_number: string | null;
  slugline: string | null;
  characters?: string[];
  props?: string[];
  location?: string | null;
}

interface AnalyzeRequest {
  imageUrl: string;
  action: 'extract_style_dna' | 'auto_tag' | 'both';
  scenes?: SceneInfo[];
  availableAssets?: { name: string; category: string }[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try { await requireAuth(req); } catch (e) { if (e instanceof Response) return e; throw e; }
    const { imageUrl, action = 'both', scenes = [], availableAssets = [] }: AnalyzeRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!imageUrl) {
      throw new Error("Image URL is required");
    }

    // Build scene context for the AI
    let sceneContext = '';
    if (scenes.length > 0) {
      sceneContext = `\n\nAvailable scenes in this project:\n${scenes.map(s => 
        `- Scene ${s.scene_number}: "${s.slugline || 'Untitled'}" | Characters: ${(s.characters || []).join(', ') || 'none'} | Props: ${(s.props || []).join(', ') || 'none'} | Location: ${s.location || 'unknown'}`
      ).join('\n')}`;
    }

    let assetContext = '';
    if (availableAssets.length > 0) {
      const grouped: Record<string, string[]> = {};
      availableAssets.forEach(a => {
        if (!grouped[a.category]) grouped[a.category] = [];
        grouped[a.category].push(a.name);
      });
      assetContext = `\n\nAvailable project assets:\n${Object.entries(grouped).map(([cat, names]) => `- ${cat}s: ${names.join(', ')}`).join('\n')}`;
    }

    const categoryOptions = ['general', 'location', 'character', 'prop', 'environment', 'vehicle', 'costume', 'crop'];
    const refTypeOptions = ['reference_image', 'concept_art', 'story_panel', 'mood_board', 'texture_sample', 'color_palette', 'character_sheet', 'environment_ref', 'camera_reference'];

    const systemPrompt = `You are an expert visual art analyst for film and VFX production. Analyze the provided image and extract detailed visual characteristics, AND suggest production metadata tags.
${sceneContext}
${assetContext}

Return a JSON object with the following structure:
{
  "autoTags": {
    "lighting": ["key descriptors"],
    "mood": ["emotional qualities"],
    "color": ["dominant colors and palette"],
    "composition": ["framing, perspective, layout"],
    "style": ["artistic style descriptors"],
    "subject": ["main subjects/elements"],
    "technique": ["artistic techniques used"]
  },
  "styleDna": {
    "lightingType": "primary lighting style (e.g., dramatic, soft, rim, natural)",
    "colorTemperature": "warm/cool/neutral",
    "dominantColors": ["top 3 colors"],
    "contrastLevel": "high/medium/low",
    "saturation": "high/medium/low/desaturated",
    "mood": "primary emotional quality",
    "era": "visual era if applicable",
    "genre": "suggested film genre fit",
    "artisticMovement": "if applicable (e.g., expressionism, minimalism)",
    "textureQuality": "clean/gritty/organic/digital"
  },
  "productionNotes": "Brief notes on how this reference could inform production design",
  "suggestedTags": {
    "category": "one of: ${categoryOptions.join(', ')} — pick the best match based on the image content",
    "referenceType": "one of: ${refTypeOptions.join(', ')} — pick the best match",
    "suggestedSceneId": "the scene ID that best matches this image (from the available scenes list), or null if no clear match",
    "suggestedSceneReason": "brief explanation of why this scene was suggested",
    "suggestedAssetTags": ["list of asset names from the available project assets that appear or are relevant to this image"],
    "suggestedTitle": "a concise descriptive title for this reference",
    "suggestedDescription": "a brief production-relevant description of the image"
  }
}

IMPORTANT for suggestedTags:
- For "category": Analyze the PRIMARY subject of the image. If it shows a person/character, use "character". If it's a place/landscape, use "location" or "environment". If it shows an object, use "prop". etc.
- For "referenceType": If the image looks hand-painted or digitally illustrated, use "concept_art". If it's a photographic reference, use "reference_image". If it looks like a storyboard frame, use "story_panel". etc.
- For "suggestedSceneId": ONLY suggest a scene ID from the provided scenes list. Match based on location, characters visible, props shown, or mood.
- For "suggestedAssetTags": ONLY suggest asset names from the provided assets list. Match based on what's visible or relevant in the image.`;

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
            content: [
              { type: "text", text: "Analyze this reference image and extract its visual DNA and suggest production tags for it." },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ success: false, error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Analysis failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    let analysis;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      analysis = JSON.parse(jsonStr.trim());
    } catch {
      console.error("Failed to parse analysis JSON:", content);
      analysis = {
        autoTags: {
          lighting: ["analyzed"],
          mood: ["professional"],
          color: ["varied"],
          composition: ["standard"],
          style: ["production reference"],
          subject: ["scene element"],
          technique: ["digital"]
        },
        styleDna: {
          lightingType: "mixed",
          colorTemperature: "neutral",
          dominantColors: ["gray", "blue", "brown"],
          contrastLevel: "medium",
          saturation: "medium",
          mood: "neutral",
          textureQuality: "clean"
        },
        productionNotes: "Reference analyzed. Manual review recommended for detailed style extraction.",
        suggestedTags: {
          category: "general",
          referenceType: "reference_image",
          suggestedSceneId: null,
          suggestedSceneReason: null,
          suggestedAssetTags: [],
          suggestedTitle: null,
          suggestedDescription: null,
        }
      };
    }

    return new Response(JSON.stringify({
      success: true,
      autoTags: analysis.autoTags,
      styleDna: analysis.styleDna,
      productionNotes: analysis.productionNotes,
      suggestedTags: analysis.suggestedTags || null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-reference:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
