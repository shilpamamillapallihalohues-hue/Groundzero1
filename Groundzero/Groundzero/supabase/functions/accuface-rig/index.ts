import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AccuFaceRequest {
  action: 'create_rig' | 'get_status' | 'download_result';
  // For create_rig
  glbUrl?: string;
  characterName?: string;
  projectId?: string;
  options?: {
    outputFormat?: 'fbx' | 'glb';
    blendShapeSet?: 'arkit_52' | 'facs_full' | 'basic';
    includeNeckBones?: boolean;
    symmetryEnforce?: boolean;
    textureResolution?: 2048 | 4096;
  };
  // For status/download
  taskId?: string;
}

// AccuFace API simulation - in production this would connect to Reallusion's API
// Note: Reallusion AccuFace requires a commercial license
const ACCUFACE_API_BASE = 'https://api.reallusion.com/accuface/v1';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try { await requireAuth(req); } catch (e) { if (e instanceof Response) return e; throw e; }
    const request: AccuFaceRequest = await req.json();
    const { action } = request;

    console.log('AccuFace request:', action);

    // Check for AccuFace API key
    const ACCUFACE_API_KEY = Deno.env.get('ACCUFACE_API_KEY');
    
    // If no API key, provide manual workflow instructions
    if (!ACCUFACE_API_KEY) {
      return new Response(JSON.stringify({
        success: true,
        mode: 'manual',
        message: 'AccuFace API not configured. Use manual workflow instead.',
        manualWorkflow: {
          title: 'Manual AccuFace/Character Creator Workflow',
          steps: [
            {
              step: 1,
              title: 'Export from Lovable',
              description: 'Download the high-poly GLB model from the turnaround generator',
            },
            {
              step: 2,
              title: 'Import to Character Creator 4',
              description: 'Open Character Creator 4 and use File → Import → 3D Head Mesh',
            },
            {
              step: 3,
              title: 'AccuFace Processing',
              description: 'Use the Headshot plugin or AccuFace to auto-rig the head mesh',
              subSteps: [
                'Select the imported mesh',
                'Go to Modify → AccuFace',
                'Configure blend shape set (ARKit 52 recommended)',
                'Click "Generate Rig"',
              ],
            },
            {
              step: 4,
              title: 'Blend Shape Setup',
              description: 'AccuFace will generate 52 ARKit-compatible blend shapes automatically',
              blendShapes: [
                'Eye movements (8 shapes)',
                'Brow movements (5 shapes)',
                'Cheek/Jaw (10 shapes)',
                'Mouth shapes (25 shapes)',
                'Nose/Tongue (4 shapes)',
              ],
            },
            {
              step: 5,
              title: 'Export for MetaHuman',
              description: 'Export as FBX with these settings for MetaHuman compatibility:',
              settings: {
                format: 'FBX 2020',
                scale: 1.0,
                embedMedia: true,
                blendShapes: true,
                skeleton: 'Include',
              },
            },
            {
              step: 6,
              title: 'Import to Unreal Engine',
              description: 'Use the Mesh-to-MetaHuman tool or direct skeleton retargeting',
            },
          ],
          downloadLinks: {
            characterCreator: 'https://www.reallusion.com/character-creator/',
            headshot: 'https://www.reallusion.com/character-creator/headshot/',
            documentation: 'https://manual.reallusion.com/Character_Creator_4/ENU/Content/10_Plugins/Headshot.htm',
          },
        },
        arkitBlendShapes: getARKitBlendShapeList(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If API key exists, proceed with automated workflow
    if (action === 'create_rig') {
      if (!request.glbUrl) {
        throw new Error('glbUrl is required');
      }

      const options = request.options || {};
      
      // Create rigging task with AccuFace API
      const response = await fetch(`${ACCUFACE_API_BASE}/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCUFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input_url: request.glbUrl,
          character_name: request.characterName || 'Character',
          output_format: options.outputFormat || 'fbx',
          blend_shape_set: options.blendShapeSet || 'arkit_52',
          include_neck_bones: options.includeNeckBones !== false,
          symmetry_enforce: options.symmetryEnforce !== false,
          texture_resolution: options.textureResolution || 4096,
          // MetaHuman compatibility settings
          metahuman_compatible: true,
          skeleton_type: 'metahuman_face',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AccuFace API error:', response.status, errorText);
        throw new Error(`AccuFace API error: ${response.status}`);
      }

      const result = await response.json();
      
      return new Response(JSON.stringify({
        success: true,
        mode: 'automated',
        taskId: result.task_id,
        status: 'processing',
        estimatedTime: '3-5 minutes',
        message: 'AccuFace rigging task created. The mesh will be auto-rigged with 52 ARKit blend shapes.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_status') {
      if (!request.taskId) {
        throw new Error('taskId is required');
      }

      const response = await fetch(`${ACCUFACE_API_BASE}/tasks/${request.taskId}`, {
        headers: {
          'Authorization': `Bearer ${ACCUFACE_API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get task status: ${response.status}`);
      }

      const result = await response.json();

      return new Response(JSON.stringify({
        success: true,
        taskId: request.taskId,
        status: result.status,
        progress: result.progress,
        downloadUrl: result.output_url || null,
        blendShapeCount: result.blend_shape_count || 0,
        message: result.status === 'completed' 
          ? 'Rigging complete! Download your auto-rigged FBX with blend shapes.'
          : 'Processing in progress...',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error('AccuFace error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to return the full ARKit blend shape list
function getARKitBlendShapeList() {
  return {
    eyeMovements: [
      'eyeBlinkLeft', 'eyeBlinkRight',
      'eyeLookDownLeft', 'eyeLookDownRight',
      'eyeLookInLeft', 'eyeLookInRight',
      'eyeLookOutLeft', 'eyeLookOutRight',
      'eyeLookUpLeft', 'eyeLookUpRight',
      'eyeSquintLeft', 'eyeSquintRight',
      'eyeWideLeft', 'eyeWideRight',
    ],
    browMovements: [
      'browDownLeft', 'browDownRight',
      'browInnerUp',
      'browOuterUpLeft', 'browOuterUpRight',
    ],
    cheekJaw: [
      'cheekPuff',
      'cheekSquintLeft', 'cheekSquintRight',
      'jawForward', 'jawLeft', 'jawOpen', 'jawRight',
    ],
    mouthShapes: [
      'mouthClose',
      'mouthDimpleLeft', 'mouthDimpleRight',
      'mouthFrownLeft', 'mouthFrownRight',
      'mouthFunnel',
      'mouthLeft', 'mouthRight',
      'mouthLowerDownLeft', 'mouthLowerDownRight',
      'mouthPressLeft', 'mouthPressRight',
      'mouthPucker',
      'mouthRollLower', 'mouthRollUpper',
      'mouthShrugLower', 'mouthShrugUpper',
      'mouthSmileLeft', 'mouthSmileRight',
      'mouthStretchLeft', 'mouthStretchRight',
      'mouthUpperUpLeft', 'mouthUpperUpRight',
    ],
    noseTongue: [
      'noseSneerLeft', 'noseSneerRight',
      'tongueOut',
    ],
    totalCount: 52,
  };
}
