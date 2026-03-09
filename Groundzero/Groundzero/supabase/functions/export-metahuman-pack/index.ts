import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MetaHumanExportRequest {
  glbUrl: string;
  characterName: string;
  projectId: string;
  attributes?: {
    gender?: string;
    ageRange?: string;
    skinTone?: string;
    eyeColor?: string;
    hairStyle?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try { await requireAuth(req); } catch (e) { if (e instanceof Response) return e; throw e; }
    const request: MetaHumanExportRequest = await req.json();
    const { glbUrl, characterName, projectId, attributes } = request;

    if (!glbUrl || !characterName) {
      throw new Error('glbUrl and characterName are required');
    }

    console.log('Creating MetaHuman export pack for:', characterName);

    // Generate MetaHuman-compatible config for Mesh-to-MetaHuman workflow
    const metahumanConfig = {
      version: "1.0",
      source: "Lovable Studio",
      exportDate: new Date().toISOString(),
      character: {
        name: characterName,
        projectId: projectId,
      },
      meshSettings: {
        // Mesh-to-MetaHuman requirements
        topology: "quad",
        targetPolycount: 80000,
        symmetry: true,
        uvUnwrap: "standard_head",
        // Face landmark regions for proper mapping
        landmarkRegions: {
          leftEye: { centerU: 0.35, centerV: 0.55 },
          rightEye: { centerU: 0.65, centerV: 0.55 },
          nose: { centerU: 0.5, centerV: 0.45 },
          mouth: { centerU: 0.5, centerV: 0.3 },
          leftEar: { centerU: 0.1, centerV: 0.5 },
          rightEar: { centerU: 0.9, centerV: 0.5 },
        },
      },
      textureSettings: {
        resolution: 4096,
        format: "png",
        channels: {
          diffuse: true,
          normal: true,
          roughness: true,
          specular: true,
          subsurface: true,
        },
      },
      characterAttributes: {
        gender: attributes?.gender || "neutral",
        ageRange: attributes?.ageRange || "adult",
        skinTone: attributes?.skinTone || "medium",
        eyeColor: attributes?.eyeColor || "brown",
        hairStyle: attributes?.hairStyle || "bald",
      },
      unrealEngineSettings: {
        targetVersion: "5.4",
        metahumanVersion: "latest",
        importPath: `/Game/Characters/${characterName}`,
        skeletonAsset: "/Game/MetaHumans/Common/Face/Face_Archetype_Skeleton",
        // Blueprint settings
        createBlueprintClass: true,
        parentClass: "MetaHuman_Base",
      },
      blendShapeMapping: {
        // ARKit to MetaHuman blend shape mapping
        standard52: true,
        targetNames: [
          "browDownLeft", "browDownRight", "browInnerUp",
          "browOuterUpLeft", "browOuterUpRight",
          "cheekPuff", "cheekSquintLeft", "cheekSquintRight",
          "eyeBlinkLeft", "eyeBlinkRight",
          "eyeLookDownLeft", "eyeLookDownRight",
          "eyeLookInLeft", "eyeLookInRight",
          "eyeLookOutLeft", "eyeLookOutRight",
          "eyeLookUpLeft", "eyeLookUpRight",
          "eyeSquintLeft", "eyeSquintRight",
          "eyeWideLeft", "eyeWideRight",
          "jawForward", "jawLeft", "jawOpen", "jawRight",
          "mouthClose", "mouthDimpleLeft", "mouthDimpleRight",
          "mouthFrownLeft", "mouthFrownRight",
          "mouthFunnel", "mouthLeft",
          "mouthLowerDownLeft", "mouthLowerDownRight",
          "mouthPressLeft", "mouthPressRight",
          "mouthPucker", "mouthRight", "mouthRollLower", "mouthRollUpper",
          "mouthShrugLower", "mouthShrugUpper",
          "mouthSmileLeft", "mouthSmileRight",
          "mouthStretchLeft", "mouthStretchRight",
          "mouthUpperUpLeft", "mouthUpperUpRight",
          "noseSneerLeft", "noseSneerRight",
          "tongueOut"
        ],
      },
      rigSettings: {
        // Skeleton retargeting info
        retargetTo: "MetaHuman_Skeleton",
        boneMapping: {
          head: "head",
          neck: "neck_01",
          spine: "spine_05",
        },
        // Face rig settings
        faceRig: {
          type: "MetaHuman_Face_Rig",
          controlsEnabled: true,
          LOD: 0,
        },
      },
      exportFormats: {
        primary: "fbx",
        fbxSettings: {
          version: "FBX2020",
          embedMedia: true,
          binaryFormat: true,
          axisSystem: "UnrealEngine",
          scale: 1.0,
        },
        additionalFormats: ["glb", "obj"],
      },
      instructions: {
        step1: "Import the FBX file into Unreal Engine 5.4+",
        step2: "Open the Mesh-to-MetaHuman tool from the Quixel Bridge menu",
        step3: "Select the imported mesh and click 'Convert to MetaHuman'",
        step4: "The tool will automatically apply the config settings",
        step5: "Review and adjust facial features in the MetaHuman Creator",
        step6: "Export as a new MetaHuman asset",
      },
    };

    // Create a downloadable JSON config file
    const configJson = JSON.stringify(metahumanConfig, null, 2);
    const configBlob = new Blob([configJson], { type: 'application/json' });
    
    // Initialize Supabase client for storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Upload config file to storage
    const configFileName = `${characterName.toLowerCase().replace(/\s+/g, '_')}_metahuman_config.json`;
    const storagePath = `metahuman-exports/${projectId}/${configFileName}`;

    const { error: uploadError } = await supabase.storage
      .from('project-deliverables')
      .upload(storagePath, configJson, {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadError) {
      console.error('Config upload error:', uploadError);
      // Continue even if storage fails, we'll return the config directly
    }

    // Get public URL for the config
    const { data: publicUrlData } = supabase.storage
      .from('project-deliverables')
      .getPublicUrl(storagePath);

    console.log('MetaHuman export pack created successfully');

    return new Response(JSON.stringify({
      success: true,
      characterName,
      config: metahumanConfig,
      configUrl: publicUrlData?.publicUrl || null,
      glbUrl: glbUrl,
      message: `MetaHuman export pack ready for ${characterName}. Download the GLB and config file, then use UE5 Mesh-to-MetaHuman tool.`,
      instructions: [
        "1. Download the GLB model file",
        "2. Download the MetaHuman config JSON",
        "3. Import GLB into Blender, export as FBX with these settings:",
        "   - Scale: 1.0, Apply Modifiers: Yes, Add Leaf Bones: No",
        "4. Open Unreal Engine 5.4+ with MetaHuman plugin enabled",
        "5. Use Mesh-to-MetaHuman tool from Quixel Bridge",
        "6. Select the FBX and the config file",
        "7. Follow the wizard to complete conversion",
      ],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('MetaHuman export error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
