import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ... keep existing code (MESHY_API_BASE, MeshyRequest interface)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try { await requireAuth(req); } catch (e) { if (e instanceof Response) return e; throw e; }
    const MESHY_API_KEY = Deno.env.get('MESHY_API_KEY');
    if (!MESHY_API_KEY) {
      throw new Error('MESHY_API_KEY is not configured');
    }

    const request: MeshyRequest = await req.json();
    const { action } = request;

    console.log('Meshy 3D request:', action);

    const headers = {
      'Authorization': `Bearer ${MESHY_API_KEY}`,
      'Content-Type': 'application/json',
    };

    // Image to 3D
    if (action === 'create_image_to_3d') {
      if (!request.imageUrl) {
        throw new Error('imageUrl is required for image-to-3d');
      }

      // Determine polycount based on quality mode - MAXIMUM QUALITY settings
      let targetPolycount = request.targetPolycount || 50000;
      let textureResolution = request.textureResolution || 4096;
      
      if (request.qualityMode === 'ultra_high_poly') {
        targetPolycount = 250000; // 250k for maximum detail
        textureResolution = 8192; // 8K textures
      } else if (request.qualityMode === 'high_poly') {
        targetPolycount = 200000; // 200k for very high detail
        textureResolution = 8192; // 8K textures
      } else if (request.qualityMode === 'blend_shapes') {
        targetPolycount = 150000; // 150k with quad topology for blend shapes
        textureResolution = 8192; // 8K textures for skin detail
      }

      const body: Record<string, unknown> = {
        image_url: request.imageUrl,
        ai_model: request.aiModel || 'meshy-6', // Use latest model for better quality
        topology: request.qualityMode === 'blend_shapes' ? 'quad' : (request.topology || 'quad'),
        target_polycount: targetPolycount,
        symmetry_mode: request.qualityMode === 'blend_shapes' ? 'on' : (request.symmetryMode || 'auto'),
        should_remesh: request.shouldRemesh !== false,
        should_texture: request.shouldTexture !== false,
        enable_pbr: request.qualityMode ? true : (request.enablePbr || false), // Always enable PBR for quality modes
        texture_resolution: textureResolution,
      };

      if (request.texturePrompt) {
        body.texture_prompt = request.texturePrompt;
      }

      console.log('Creating image-to-3d task with quality mode:', request.qualityMode, body);

      const response = await fetch(`${MESHY_API_BASE}/image-to-3d`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Meshy API error:', response.status, errorText);
        
        if (response.status === 401) {
          throw new Error('Invalid Meshy API key');
        }
        if (response.status === 402) {
          throw new Error('Insufficient Meshy credits');
        }
        if (response.status === 429) {
          throw new Error('Meshy rate limit exceeded');
        }
        
        throw new Error(`Meshy API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Image-to-3d task created:', result);

      return new Response(JSON.stringify({
        success: true,
        taskId: result.result,
        message: '3D generation task created successfully',
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
        mode: 'preview',
        prompt: request.prompt,
        negative_prompt: request.negativePrompt || 'low quality, blurry, distorted',
        art_style: request.artStyle || 'realistic',
        ai_model: request.aiModel || 'meshy-4',
        topology: request.topology || 'quad',
        target_polycount: request.targetPolycount || 30000,
        should_remesh: request.shouldRemesh !== false,
      };

      console.log('Creating text-to-3d task:', body);

      const response = await fetch(`${MESHY_API_BASE}/text-to-3d`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Meshy API error:', response.status, errorText);
        
        if (response.status === 401) {
          throw new Error('Invalid Meshy API key');
        }
        if (response.status === 402) {
          throw new Error('Insufficient Meshy credits');
        }
        if (response.status === 429) {
          throw new Error('Meshy rate limit exceeded');
        }
        
        throw new Error(`Meshy API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Text-to-3d task created:', result);

      return new Response(JSON.stringify({
        success: true,
        taskId: result.result,
        message: '3D generation task created successfully',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get task status
    if (action === 'get_task_status') {
      if (!request.taskId) {
        throw new Error('taskId is required for status check');
      }

      // Try image-to-3d endpoint first, then text-to-3d
      let response = await fetch(`${MESHY_API_BASE}/image-to-3d/${request.taskId}`, {
        method: 'GET',
        headers,
      });

      if (response.status === 404) {
        // Try text-to-3d endpoint
        response = await fetch(`${MESHY_API_BASE}/text-to-3d/${request.taskId}`, {
          method: 'GET',
          headers,
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Meshy status check error:', response.status, errorText);
        throw new Error(`Failed to get task status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Task status:', result);

      // Map Meshy status to our format
      const statusMap: Record<string, string> = {
        'PENDING': 'pending',
        'IN_PROGRESS': 'processing',
        'SUCCEEDED': 'completed',
        'FAILED': 'failed',
        'EXPIRED': 'expired',
      };

      // Check if we have model URLs even if still showing IN_PROGRESS (edge case)
      // Sometimes Meshy returns model_urls before status updates to SUCCEEDED
      const hasModelUrls = result.model_urls?.glb && result.model_urls.glb.length > 0;
      let finalStatus = statusMap[result.status] || result.status.toLowerCase();
      
      // If progress is 100% or we have model URLs, consider it completed
      if ((result.progress >= 100 || hasModelUrls) && result.status !== 'FAILED') {
        finalStatus = 'completed';
        console.log('Task completed with model URLs:', result.model_urls);
      }

      return new Response(JSON.stringify({
        success: true,
        taskId: request.taskId,
        status: finalStatus,
        progress: result.progress || 0,
        modelUrls: result.model_urls || null,
        thumbnailUrl: result.thumbnail_url || null,
        videoUrl: result.video_url || null,
        textureUrls: result.texture_urls || null,
        taskError: result.task_error?.message || null,
        createdAt: result.created_at,
        finishedAt: result.finished_at,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // List tasks
    if (action === 'list_tasks') {
      const response = await fetch(`${MESHY_API_BASE}/image-to-3d?sortBy=-created_at&pageSize=20`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Meshy list error:', response.status, errorText);
        throw new Error(`Failed to list tasks: ${response.status}`);
      }

      const result = await response.json();
      console.log('Tasks listed:', result);

      return new Response(JSON.stringify({
        success: true,
        tasks: result.result || [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error('Error in meshy-3d-generate:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
