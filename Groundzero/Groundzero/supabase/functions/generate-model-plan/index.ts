import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ModelPlanRequest {
  assetName: string;
  assetCategory: string;
  description?: string;
  conceptArtUrl?: string;
  sceneContext?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try { await requireAuth(req); } catch (e) { if (e instanceof Response) return e; throw e; }
    const { assetName, assetCategory, description, conceptArtUrl, sceneContext }: ModelPlanRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating model plan for: ${assetName} (${assetCategory})`);

    const planPrompt = `You are a VFX Pipeline TD and Modeling Supervisor. Generate a comprehensive model breakdown for a production asset.

Asset: ${assetName}
Category: ${assetCategory}
Description: ${description || 'No description provided'}
Scene Context: ${sceneContext || 'General production use'}

Generate a detailed model plan that includes:
1. Recommended detail level (hero/mid/background)
2. Poly density guidance
3. Texture resolution recommendations
4. Rigging needs if applicable
5. Topology suggestions
6. Geometry groups for proper organization
7. Material slots needed
8. Texture sets required
9. LOD hierarchy recommendations
10. FX attachment points if needed

Be specific and production-ready.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: planPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_model_plan",
              description: "Generate a comprehensive 3D model production plan",
              parameters: {
                type: "object",
                properties: {
                  detailLevel: { 
                    type: "string", 
                    enum: ["hero", "mid", "background", "proxy"],
                    description: "Required detail level for the asset"
                  },
                  polyDensityGuidance: { 
                    type: "string",
                    description: "Polygon count recommendations (e.g., '50k-100k polys')"
                  },
                  textureResolution: { 
                    type: "string",
                    description: "Recommended texture resolution (e.g., '4K for hero, 2K for mid')"
                  },
                  riggingNeeds: {
                    type: "object",
                    properties: {
                      required: { type: "boolean" },
                      type: { type: "string" },
                      jointCount: { type: "string" },
                      deformationNeeds: { type: "array", items: { type: "string" } }
                    }
                  },
                  topologySuggestions: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of topology best practices for this asset"
                  },
                  scaleReference: {
                    type: "object",
                    properties: {
                      realWorldScale: { type: "string" },
                      unitSystem: { type: "string" },
                      referenceObject: { type: "string" }
                    }
                  },
                  geometryGroups: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        purpose: { type: "string" }
                      }
                    },
                    description: "Organized geometry groups for the model"
                  },
                  materialSlots: {
                    type: "array",
                    items: { type: "string" },
                    description: "Required material slots"
                  },
                  textureSets: {
                    type: "array",
                    items: { type: "string" },
                    description: "Required texture sets (diffuse, normal, roughness, etc.)"
                  },
                  rigLayers: {
                    type: "array",
                    items: { type: "string" },
                    description: "Rig layer organization if applicable"
                  },
                  fxAttachmentPoints: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        location: { type: "string" },
                        fxType: { type: "string" }
                      }
                    }
                  },
                  lodHierarchy: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        level: { type: "string" },
                        polyReduction: { type: "string" },
                        distance: { type: "string" }
                      }
                    }
                  },
                  complexityScore: {
                    type: "number",
                    description: "Estimated complexity 0-100"
                  },
                  estimatedHours: {
                    type: "number",
                    description: "Estimated modeling hours"
                  }
                },
                required: ["detailLevel", "polyDensityGuidance", "textureResolution", "geometryGroups", "materialSlots"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_model_plan" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Rate limit exceeded. Please try again." 
        }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "AI credits exhausted." 
        }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let modelPlan;
    
    if (toolCall?.function?.arguments) {
      modelPlan = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback default plan
      modelPlan = {
        detailLevel: "mid",
        polyDensityGuidance: "10k-50k polys",
        textureResolution: "2K",
        riggingNeeds: { required: false },
        topologySuggestions: ["Maintain quad topology", "Even polygon distribution"],
        geometryGroups: [{ name: "main_body", purpose: "Primary geometry" }],
        materialSlots: ["main_material"],
        textureSets: ["diffuse", "normal", "roughness"],
        lodHierarchy: [
          { level: "LOD0", polyReduction: "100%", distance: "0-10m" },
          { level: "LOD1", polyReduction: "50%", distance: "10-30m" }
        ],
        complexityScore: 50,
        estimatedHours: 8
      };
    }

    console.log("Model plan generated successfully");

    return new Response(JSON.stringify({
      success: true,
      modelPlan,
      assetName,
      assetCategory
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-model-plan:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
