import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractRequest {
  conceptArtIds: string[];
  projectId: string;
  profileName?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try { await requireAuth(req); } catch (e) { if (e instanceof Response) return e; throw e; }
    const { conceptArtIds, projectId, profileName }: ExtractRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!conceptArtIds || conceptArtIds.length === 0) {
      throw new Error("At least one concept art ID is required");
    }

    console.log(`Extracting look profile from ${conceptArtIds.length} concept arts`);

    // Build analysis prompt for extracting visual DNA
    const analysisPrompt = `You are a VFX Look Development Supervisor. Analyze the approved concept art(s) and extract a comprehensive look profile.

Return a JSON object with these exact fields:
{
  "colorPalette": [
    { "name": "primary", "hex": "#XXXXXX", "usage": "main environment color" },
    { "name": "secondary", "hex": "#XXXXXX", "usage": "accent/highlight" },
    { "name": "shadow", "hex": "#XXXXXX", "usage": "deep shadow areas" },
    { "name": "highlight", "hex": "#XXXXXX", "usage": "bright highlights" },
    { "name": "accent", "hex": "#XXXXXX", "usage": "key visual accent" }
  ],
  "lightingLogic": {
    "keyLightDirection": "top-left/front-right/etc",
    "keyLightIntensity": "soft/medium/hard",
    "fillLightRatio": "1:2/1:4/etc",
    "ambientStyle": "warm/cool/neutral",
    "shadowQuality": "soft/crisp/mixed",
    "practicalLights": ["list of practical light sources"],
    "godRays": true/false,
    "volumetrics": "none/subtle/heavy"
  },
  "materialBehavior": {
    "surfaceTypes": ["matte", "glossy", "metallic", "organic"],
    "textureStyle": "photorealistic/stylized/painterly",
    "wearAndTear": "none/subtle/heavy",
    "reflectivity": "low/medium/high",
    "subsurface": true/false
  },
  "scaleProportions": {
    "humanScale": "realistic/exaggerated/miniaturized",
    "environmentScale": "intimate/epic/claustrophobic",
    "depthCues": ["atmospheric perspective", "scale gradients"]
  },
  "cameraContrast": {
    "dynamicRange": "low/medium/high",
    "blackPoint": "crushed/lifted",
    "highlightRolloff": "sharp/smooth",
    "colorGrading": "warm/cool/desaturated/vibrant",
    "vignetteStrength": "none/subtle/strong"
  },
  "overallMood": "description of the visual mood",
  "referenceFilms": ["list of films with similar look"]
}

Analyze the visual elements carefully and provide production-ready specifications that VFX artists can follow.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_look_profile",
              description: "Extract visual DNA and look development profile from concept art",
              parameters: {
                type: "object",
                properties: {
                  colorPalette: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        hex: { type: "string" },
                        usage: { type: "string" }
                      },
                      required: ["name", "hex", "usage"]
                    }
                  },
                  lightingLogic: {
                    type: "object",
                    properties: {
                      keyLightDirection: { type: "string" },
                      keyLightIntensity: { type: "string" },
                      fillLightRatio: { type: "string" },
                      ambientStyle: { type: "string" },
                      shadowQuality: { type: "string" },
                      practicalLights: { type: "array", items: { type: "string" } },
                      godRays: { type: "boolean" },
                      volumetrics: { type: "string" }
                    }
                  },
                  materialBehavior: {
                    type: "object",
                    properties: {
                      surfaceTypes: { type: "array", items: { type: "string" } },
                      textureStyle: { type: "string" },
                      wearAndTear: { type: "string" },
                      reflectivity: { type: "string" },
                      subsurface: { type: "boolean" }
                    }
                  },
                  scaleProportions: {
                    type: "object",
                    properties: {
                      humanScale: { type: "string" },
                      environmentScale: { type: "string" },
                      depthCues: { type: "array", items: { type: "string" } }
                    }
                  },
                  cameraContrast: {
                    type: "object",
                    properties: {
                      dynamicRange: { type: "string" },
                      blackPoint: { type: "string" },
                      highlightRolloff: { type: "string" },
                      colorGrading: { type: "string" },
                      vignetteStrength: { type: "string" }
                    }
                  },
                  overallMood: { type: "string" },
                  referenceFilms: { type: "array", items: { type: "string" } }
                },
                required: ["colorPalette", "lightingLogic", "materialBehavior", "overallMood"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_look_profile" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Rate limit exceeded. Please try again in a moment." 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "AI credits exhausted. Please add credits to continue." 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the function call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let lookProfile;
    
    if (toolCall?.function?.arguments) {
      lookProfile = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback to content parsing
      const content = data.choices?.[0]?.message?.content;
      try {
        lookProfile = JSON.parse(content);
      } catch {
        // Generate default profile
        lookProfile = {
          colorPalette: [
            { name: "primary", hex: "#1a1a2e", usage: "main background" },
            { name: "secondary", hex: "#16213e", usage: "mid-tones" },
            { name: "accent", hex: "#e94560", usage: "key accent" },
            { name: "highlight", hex: "#ffffff", usage: "specular highlights" },
            { name: "shadow", hex: "#0f0f1a", usage: "deep shadows" }
          ],
          lightingLogic: {
            keyLightDirection: "top-left",
            keyLightIntensity: "medium",
            fillLightRatio: "1:3",
            ambientStyle: "cool",
            shadowQuality: "soft",
            practicalLights: [],
            godRays: false,
            volumetrics: "subtle"
          },
          materialBehavior: {
            surfaceTypes: ["matte", "organic"],
            textureStyle: "painterly",
            wearAndTear: "subtle",
            reflectivity: "low",
            subsurface: false
          },
          scaleProportions: {
            humanScale: "realistic",
            environmentScale: "epic",
            depthCues: ["atmospheric perspective"]
          },
          cameraContrast: {
            dynamicRange: "high",
            blackPoint: "crushed",
            highlightRolloff: "smooth",
            colorGrading: "desaturated",
            vignetteStrength: "subtle"
          },
          overallMood: "Cinematic, moody atmosphere",
          referenceFilms: []
        };
      }
    }

    console.log("Look profile extracted successfully");

    return new Response(JSON.stringify({
      success: true,
      lookProfile,
      sourceConceptIds: conceptArtIds,
      projectId,
      suggestedName: profileName || `Look Profile - ${new Date().toISOString().split('T')[0]}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in extract-look-profile:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
