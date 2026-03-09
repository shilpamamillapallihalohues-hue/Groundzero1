import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MotionExtractionRequest {
  projectId: string;
  clipName: string;
  videoUrl: string;
  proxyModelId?: string;
  sceneId?: string;
  storyboardId?: string;
  motionType: string;
  includeFacial: boolean;
  frameRange?: { start: number; end: number };
  notes?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try { await requireAuth(req); } catch (e) { if (e instanceof Response) return e; throw e; }
    const request: MotionExtractionRequest = await req.json();
    const { projectId, clipName, videoUrl, proxyModelId, sceneId, storyboardId, motionType, includeFacial, frameRange, notes } = request;

    console.log('Extracting motion:', { projectId, clipName, videoUrl, motionType, includeFacial });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build analysis prompt for motion extraction planning
    const analysisPrompt = `You are a motion capture technical director analyzing a reference video for animation extraction.

PROJECT CONTEXT:
- Clip Name: ${clipName}
- Video URL: ${videoUrl}
- Motion Type: ${motionType} (body only or full body + fingers)
- Include Facial: ${includeFacial ? 'Yes' : 'No'}
${frameRange ? `- Frame Range: ${frameRange.start} to ${frameRange.end}` : '- Frame Range: Full video'}
${notes ? `- Artist Notes: ${notes}` : ''}

TASK: Plan the motion extraction process for this reference video. This will produce BLOCKING-LEVEL animation, not final polished motion.

REQUIREMENTS:
1. This is an AI Motion Proxy - blocking level timing only
2. Focus on body mechanics and major poses
3. Preserve timing and direction from reference
4. No facial animation unless explicitly enabled
5. Output will be labeled as "AI Motion Proxy"

OUTPUT FORMAT (respond with a JSON object):
{
  "motionAnalysis": {
    "primaryAction": "main action/movement type",
    "timing": "tempo/rhythm notes",
    "keyPoses": ["list of key poses identified"],
    "locomotionType": "walk/run/idle/action description"
  },
  "extractionPlan": {
    "skeletonType": "humanoid/quadruped/custom",
    "jointCount": "estimated number of tracked joints",
    "trackingConfidence": "high/medium/low based on video quality",
    "challengeAreas": ["potential tracking difficulties"]
  },
  "retargetingNotes": {
    "scaleAdjustments": "notes on adapting to target character",
    "proportionMapping": "how source proportions map to target",
    "poseAdjustments": "any pose modifications needed"
  },
  "qualityFlags": {
    "isActorLikeness": false,
    "requiresManualCleanup": true,
    "confidenceLevel": "percentage estimate"
  },
  "limitations": [
    "Blocking-level timing only",
    "No final acting polish",
    "Requires animator refinement"
  ],
  "estimatedDuration": "estimated clip duration in seconds",
  "estimatedFrameCount": "estimated frame count at 24fps"
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
          { role: 'system', content: 'You are a motion capture and animation technical director, specializing in motion extraction and retargeting for VFX and animation pipelines.' },
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
      motionAnalysis: {
        primaryAction: 'Body motion from reference video',
        timing: 'Natural timing preserved',
        keyPoses: ['Start pose', 'Key action poses', 'End pose'],
        locomotionType: 'Reference action'
      },
      extractionPlan: {
        skeletonType: 'humanoid',
        jointCount: '24 major joints',
        trackingConfidence: 'medium',
        challengeAreas: ['Occlusion handling', 'Fast motion blur']
      },
      retargetingNotes: {
        scaleAdjustments: 'Scale to target character proportions',
        proportionMapping: 'Standard humanoid mapping',
        poseAdjustments: 'Minor adjustments for target rig'
      },
      qualityFlags: {
        isActorLikeness: false,
        requiresManualCleanup: true,
        confidenceLevel: '70%'
      },
      limitations: [
        'Blocking-level timing only',
        'No final acting polish',
        'AI Motion Proxy label required',
        'Animator review required'
      ],
      estimatedDuration: 'Pending video analysis',
      estimatedFrameCount: 'Pending video analysis'
    };

    console.log('Motion extraction analysis complete');

    return new Response(JSON.stringify({
      success: true,
      clipName,
      motionType,
      includeFacial,
      analysis: result,
      limitations: result.limitations,
      qualityFlags: result.qualityFlags,
      message: 'Motion extraction plan generated. Actual motion extraction would be handled by external motion capture tools.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in extract-motion:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
