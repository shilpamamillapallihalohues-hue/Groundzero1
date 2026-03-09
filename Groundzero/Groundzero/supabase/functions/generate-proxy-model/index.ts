import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProxyModelRequest {
  projectId: string;
  modelName: string;
  poseType: string;
  sourceImageUrls: string[];
  characterProxyId?: string;
  sourceConceptIds?: string[];
  additionalNotes?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try { await requireAuth(req); } catch (e) { if (e instanceof Response) return e; throw e; }
    const request: ProxyModelRequest = await req.json();
    const { projectId, modelName, poseType, sourceImageUrls, characterProxyId, sourceConceptIds, additionalNotes } = request;

    console.log('Generating proxy model:', { projectId, modelName, poseType, sourceImageUrls: sourceImageUrls.length });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build analysis prompt
    const analysisPrompt = `You are a 3D modeling technical director analyzing reference images for proxy model generation.

PROJECT CONTEXT:
- Model Name: ${modelName}
- Pose Type: ${poseType} (A-Pose, T-Pose, or Neutral)
- Number of Reference Images: ${sourceImageUrls.length}
${additionalNotes ? `- Artist Notes: ${additionalNotes}` : ''}

TASK: Analyze the provided reference images and generate technical specifications for a blocking-level 3D proxy model.

REQUIREMENTS:
1. This is a PROXY model - blocking level only, not production-ready
2. Focus on proportions and silhouette accuracy
3. Suggest clean topology flow for eventual subdivision
4. Provide scale reference based on image context
5. Identify key material zones for placeholder shaders

OUTPUT FORMAT (respond with a JSON object):
{
  "proportionAnalysis": {
    "headToBodyRatio": "description of proportions",
    "limbProportions": "arm and leg length notes",
    "overallSilhouette": "key shape language"
  },
  "topologyNotes": "Suggested edge flow for clean topology - focus on deformation zones",
  "scaleReference": {
    "estimatedHeight": "in meters or relative units",
    "referenceNotes": "scale context from images"
  },
  "materialZones": [
    {"name": "zone name", "color": "hex color suggestion", "notes": "material hints"}
  ],
  "poseGuidance": {
    "targetPose": "${poseType}",
    "jointPositions": "key joint placement notes"
  },
  "limitations": [
    "Blocking-level detail only",
    "No production-ready topology",
    "Placeholder materials only"
  ],
  "complexityEstimate": "low/medium/high based on design complexity"
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a technical director for 3D modeling, specializing in character and prop model planning for VFX and animation pipelines.' },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Usage limit reached. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';
    
    // Try to parse JSON from response
    let analysisResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.log('Could not parse AI response as JSON, using defaults');
    }

    // Provide defaults if parsing failed
    const result = analysisResult || {
      proportionAnalysis: {
        headToBodyRatio: 'Standard humanoid proportions',
        limbProportions: 'Proportional limbs based on reference',
        overallSilhouette: 'Character silhouette from reference'
      },
      topologyNotes: 'Standard edge flow with focus on major deformation zones (shoulders, elbows, knees, hips)',
      scaleReference: {
        estimatedHeight: 'Based on reference context',
        referenceNotes: 'Scale to be finalized by modeling team'
      },
      materialZones: [
        { name: 'Body', color: '#808080', notes: 'Neutral gray placeholder' },
        { name: 'Head', color: '#D4A574', notes: 'Skin tone placeholder' }
      ],
      poseGuidance: {
        targetPose: poseType,
        jointPositions: 'Standard pose configuration'
      },
      limitations: [
        'Blocking-level detail only',
        'No production-ready topology',
        'Placeholder materials only',
        'Requires artist refinement'
      ],
      complexityEstimate: 'medium'
    };

    console.log('Proxy model analysis complete');

    return new Response(JSON.stringify({
      success: true,
      modelName,
      poseType,
      analysis: result,
      topologyNotes: result.topologyNotes,
      limitations: result.limitations,
      materialZones: result.materialZones,
      message: 'Proxy model specification generated. Actual 3D generation would be handled by external modeling tools.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-proxy-model:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
