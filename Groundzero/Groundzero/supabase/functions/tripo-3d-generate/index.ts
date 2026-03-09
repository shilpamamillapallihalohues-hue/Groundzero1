import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ... keep existing code (TRIPO_API_BASE, TripoRequest interface)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try { await requireAuth(req); } catch (e) { if (e instanceof Response) return e; throw e; }
    const TRIPO_API_KEY = Deno.env.get('TRIPO_API_KEY');
    if (!TRIPO_API_KEY) {
      throw new Error('TRIPO_API_KEY is not configured. Add your Tripo3D API key to enable production-quality 3D generation.');
    }

    const request: TripoRequest = await req.json();
    const { action } = request;

    console.log('Tripo 3D request:', action);

    const headers = {
      'Authorization': `Bearer ${TRIPO_API_KEY}`,
      'Content-Type': 'application/json',
    };

    // MULTI-VIEW to 3D (HIGHEST QUALITY - Production Pipeline)
    if (action === 'create_multiview_to_3d') {
      if (!request.imageUrls || request.imageUrls.length < 2) {
        throw new Error('At least 2 image URLs are required for multi-view 3D generation');
      }

      const body: Record<string, unknown> = {
        type: 'multiview_to_model',
        files: request.imageUrls.map((url, idx) => ({
          type: 'url',
          url: url,
          view: request.viewAngles?.[idx] || ['front', 'left', 'right', 'back'][idx % 4],
        })),
        model_version: request.modelVersion || 'v2.5-20250115',
        face_limit: request.faceLimit || request.targetPolycount || 100000,
        texture: request.texture !== false,
        pbr: request.pbr !== false,
        quad: request.quadTopology !== false,
      };

      console.log('Creating Tripo multiview-to-3d task for production pipeline:', body);

      const response = await fetch(`${TRIPO_API_BASE}/task`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Tripo API error:', response.status, errorText);
        
        if (response.status === 401) throw new Error('Invalid Tripo API key');
        if (response.status === 402) throw new Error('Insufficient Tripo credits');
        if (response.status === 429) throw new Error('Tripo rate limit exceeded');
        
        throw new Error(`Tripo API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Tripo multiview-to-3d task created:', result);

      if (result.code !== 0) {
        throw new Error(result.message || 'Failed to create Tripo multiview task');
      }

      return new Response(JSON.stringify({
        success: true,
        taskId: result.data.task_id,
        message: 'Production-quality 3D generation started with multi-view input',
        qualityTier: 'production',
        inputCount: request.imageUrls.length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Image to 3D (Single Image)
    if (action === 'create_image_to_3d') {
      if (!request.imageUrl) {
        throw new Error('imageUrl is required for image-to-3d');
      }

      const body: Record<string, unknown> = {
        type: 'image_to_model',
        file: {
          type: 'url',
          url: request.imageUrl,
        },
        model_version: request.modelVersion || 'v2.5-20250115',
        face_limit: request.faceLimit || request.targetPolycount || 50000,
        texture: request.texture !== false,
        pbr: request.pbr || false,
        quad: request.quadTopology || false,
      };

      console.log('Creating Tripo image-to-3d task:', body);

      const response = await fetch(`${TRIPO_API_BASE}/task`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Tripo API error:', response.status, errorText);
        
        if (response.status === 401) throw new Error('Invalid Tripo API key');
        if (response.status === 402) throw new Error('Insufficient Tripo credits');
        if (response.status === 429) throw new Error('Tripo rate limit exceeded');
        
        throw new Error(`Tripo API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Tripo image-to-3d task created:', result);

      if (result.code !== 0) {
        throw new Error(result.message || 'Failed to create Tripo task');
      }

      return new Response(JSON.stringify({
        success: true,
        taskId: result.data.task_id,
        message: '3D generation task created successfully with Tripo AI',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Text to 3D
    if (action === 'create_text_to_3d') {
      if (!request.prompt) {
        throw new Error('prompt is required for text-to-3d');
      }

      const body: Record<string, unknown> = {
        type: 'text_to_model',
        prompt: request.prompt,
        negative_prompt: request.negativePrompt || 'low quality, blurry, distorted',
        model_version: request.modelVersion || 'v2.0-20240919',
        face_limit: request.faceLimit || 30000,
        texture: request.texture !== false,
        pbr: request.pbr || false,
      };

      console.log('Creating Tripo text-to-3d task:', body);

      const response = await fetch(`${TRIPO_API_BASE}/task`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Tripo API error:', response.status, errorText);
        
        if (response.status === 401) {
          throw new Error('Invalid Tripo API key');
        }
        if (response.status === 402) {
          throw new Error('Insufficient Tripo credits');
        }
        if (response.status === 429) {
          throw new Error('Tripo rate limit exceeded');
        }
        
        throw new Error(`Tripo API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Tripo text-to-3d task created:', result);

      if (result.code !== 0) {
        throw new Error(result.message || 'Failed to create Tripo task');
      }

      return new Response(JSON.stringify({
        success: true,
        taskId: result.data.task_id,
        message: '3D generation task created successfully with Tripo AI',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get task status
    if (action === 'get_task_status') {
      if (!request.taskId) {
        throw new Error('taskId is required for status check');
      }

      const response = await fetch(`${TRIPO_API_BASE}/task/${request.taskId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Tripo status check error:', response.status, errorText);
        throw new Error(`Failed to get task status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Tripo task status:', result);

      if (result.code !== 0) {
        throw new Error(result.message || 'Failed to get task status');
      }

      const taskData = result.data;
      
      // Map Tripo status to our format
      const statusMap: Record<string, string> = {
        'queued': 'pending',
        'running': 'processing',
        'success': 'completed',
        'failed': 'failed',
        'cancelled': 'failed',
        'unknown': 'pending',
      };

      // Extract model URLs from output
      let modelUrls: Record<string, string> | null = null;
      if (taskData.output?.model) {
        modelUrls = {
          glb: taskData.output.model,
        };
        if (taskData.output.model_fbx) modelUrls.fbx = taskData.output.model_fbx;
        if (taskData.output.model_obj) modelUrls.obj = taskData.output.model_obj;
        if (taskData.output.model_usdz) modelUrls.usdz = taskData.output.model_usdz;
        if (taskData.output.base_mesh) modelUrls.base_mesh = taskData.output.base_mesh;
      }

      return new Response(JSON.stringify({
        success: true,
        taskId: request.taskId,
        status: statusMap[taskData.status] || taskData.status,
        progress: taskData.progress || 0,
        modelUrls: modelUrls,
        thumbnailUrl: taskData.output?.rendered_image || null,
        taskError: taskData.status === 'failed' ? 'Tripo generation failed' : null,
        createdAt: taskData.create_time,
        finishedAt: taskData.finish_time,
        // Additional production metadata
        polyCount: taskData.output?.face_count,
        hasRig: taskData.output?.has_rig || false,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Apply Rigging to existing model
    if (action === 'apply_rigging') {
      if (!request.taskId) {
        throw new Error('taskId of the base model is required for rigging');
      }

      const body: Record<string, unknown> = {
        type: 'rig',
        original_model_task_id: request.taskId,
        rig_type: request.rigType || 'humanoid',
      };

      console.log('Creating Tripo rigging task:', body);

      const response = await fetch(`${TRIPO_API_BASE}/task`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Tripo rigging API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      if (result.code !== 0) throw new Error(result.message || 'Failed to create rigging task');

      return new Response(JSON.stringify({
        success: true,
        taskId: result.data.task_id,
        message: 'Rigging task created - model will be auto-rigged for animation',
        rigType: request.rigType || 'humanoid',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Apply Animation preset
    if (action === 'apply_animation') {
      if (!request.taskId) {
        throw new Error('taskId of the rigged model is required for animation');
      }

      const body: Record<string, unknown> = {
        type: 'animate',
        original_model_task_id: request.taskId,
        animation: request.animationPreset || 'idle',
      };

      console.log('Creating Tripo animation task:', body);

      const response = await fetch(`${TRIPO_API_BASE}/task`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Tripo animation API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      if (result.code !== 0) throw new Error(result.message || 'Failed to create animation task');

      return new Response(JSON.stringify({
        success: true,
        taskId: result.data.task_id,
        message: `Animation '${request.animationPreset}' applied to model`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error('Error in tripo-3d-generate:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
