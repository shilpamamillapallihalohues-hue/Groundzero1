import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ComfyUIImageRequest {
  action: 'generate_image' | 'get_status' | 'test_connection' | 'generate_depth' | 'generate_normals' | 'style_transfer' | 'upscale' | 'remove_background' | 'run_custom_workflow';
  serverUrl?: string;
  prompt?: string;
  imageUrl?: string;
  styleImage?: string;
  workflowType?: string;
  taskId?: string;
  workflow?: any; // For custom workflow execution
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg?: number;
  seed?: number;
  sampler?: string;
  scheduler?: string;
  denoisingStrength?: number;
  upscaleFactor?: number;
  loraModels?: Array<{ name: string; weight: number }>;
  controlnetImage?: string;
  controlnetType?: string;
  controlnetStrength?: number;
}

// Helper function to upload base64 image to ComfyUI
async function uploadImageToComfyUI(serverUrl: string, base64Data: string): Promise<string> {
  // Extract the base64 content and mime type
  const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error("Invalid base64 image format");
  }
  
  const mimeType = matches[1];
  const base64Content = matches[2];
  
  // Convert base64 to binary
  const binaryString = atob(base64Content);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Determine file extension
  const extension = mimeType.includes('png') ? 'png' : 'jpg';
  const filename = `upload_${Date.now()}.${extension}`;
  
  // Create form data
  const formData = new FormData();
  const blob = new Blob([bytes], { type: mimeType });
  formData.append('image', blob, filename);
  formData.append('overwrite', 'true');
  
  // Upload to ComfyUI
  console.log(`Uploading image to ComfyUI: ${filename}`);
  const uploadResponse = await fetch(`${serverUrl}/upload/image`, {
    method: 'POST',
    body: formData,
  });
  
  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Failed to upload image to ComfyUI: ${errorText}`);
  }
  
  const result = await uploadResponse.json();
  console.log(`Image uploaded successfully: ${JSON.stringify(result)}`);
  
  // Return the filename that ComfyUI will use
  return result.name || filename;
}

serve(async (req) => {
  console.log("ComfyUI Image Generate function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try { await requireAuth(req); } catch (e) { if (e instanceof Response) return e; throw e; }
    const body: ComfyUIImageRequest = await req.json();
    // Don't log full base64 data
    const logBody = { ...body };
    if (logBody.imageUrl && logBody.imageUrl.startsWith('data:')) {
      logBody.imageUrl = '[base64 image data]';
    }
    if (logBody.styleImage && logBody.styleImage.startsWith('data:')) {
      logBody.styleImage = '[base64 style image data]';
    }
    if (logBody.controlnetImage && logBody.controlnetImage.startsWith('data:')) {
      logBody.controlnetImage = '[base64 controlnet image data]';
    }
    console.log("Request body:", JSON.stringify(logBody));
    
    const { 
      action, 
      serverUrl, 
      prompt,
      imageUrl,
      styleImage,
      workflowType = 'txt2img',
      taskId,
      negativePrompt,
      width = 1024,
      height = 1024,
      steps = 20,
      cfg = 7,
      seed = -1,
      sampler = 'euler',
      scheduler = 'normal',
      denoisingStrength = 0.75,
      upscaleFactor = 2,
      loraModels = [],
      controlnetImage,
      controlnetType,
      controlnetStrength = 1.0,
      workflow, // Custom workflow object
    } = body;

    // Get ComfyUI server URL from request (required)
    const comfyuiServerUrl = serverUrl?.replace(/\/$/, ''); // Remove trailing slash
    
    if (!comfyuiServerUrl) {
      console.log("No server URL provided");
      return new Response(
        JSON.stringify({ 
          success: false, 
          connected: false,
          error: "ComfyUI server URL not configured. Please set up your local ComfyUI server in External Tools." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`Action: ${action}, Server URL: ${comfyuiServerUrl}`);

    // Test connection
    if (action === 'test_connection') {
      try {
        console.log(`Testing connection to: ${comfyuiServerUrl}/system_stats`);
        
        const response = await fetch(`${comfyuiServerUrl}/system_stats`, {
          method: 'GET',
          headers: { 
            'Accept': 'application/json',
          },
        });
        
        console.log(`Response status: ${response.status}`);
        
        if (response.ok) {
          const stats = await response.json();
          console.log("Connection successful, stats:", JSON.stringify(stats));
          return new Response(
            JSON.stringify({ 
              success: true, 
              connected: true,
              stats: stats
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          const errorText = await response.text();
          console.log(`Server returned error: ${response.status} - ${errorText}`);
          return new Response(
            JSON.stringify({ 
              success: false, 
              connected: false,
              error: `Server returned status ${response.status}: ${errorText}`
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error("Connection test failed:", errorMessage);
        return new Response(
          JSON.stringify({ 
            success: false, 
            connected: false,
            error: `Cannot connect to ComfyUI server: ${errorMessage}. Make sure your ngrok tunnel is running and the URL is correct.`
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Generate image (text-to-image or image-to-image)
    if (action === 'generate_image') {
      let uploadedImageName: string | undefined;
      let uploadedControlnetImageName: string | undefined;
      
      // Upload image if img2img
      if (workflowType === 'img2img' && imageUrl && imageUrl.startsWith('data:')) {
        uploadedImageName = await uploadImageToComfyUI(comfyuiServerUrl, imageUrl);
      }
      
      // Upload controlnet image if provided
      if (controlnetImage && controlnetImage.startsWith('data:')) {
        uploadedControlnetImageName = await uploadImageToComfyUI(comfyuiServerUrl, controlnetImage);
      }

      const workflow = buildImageWorkflow({
        workflowType,
        prompt: prompt || '',
        negativePrompt: negativePrompt || '',
        width,
        height,
        steps,
        cfg,
        seed,
        sampler,
        scheduler,
        denoisingStrength,
        imageUrl: uploadedImageName,
        loraModels,
        controlnetImage: uploadedControlnetImageName,
        controlnetType,
        controlnetStrength,
      });

      console.log("Submitting workflow:", JSON.stringify(workflow));
      
      const promptResponse = await fetch(`${comfyuiServerUrl}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: workflow }),
      });

      if (!promptResponse.ok) {
        const errorText = await promptResponse.text();
        console.error("ComfyUI prompt error:", errorText);
        throw new Error(`ComfyUI prompt submission failed: ${errorText}`);
      }

      const promptResult = await promptResponse.json();
      console.log("Prompt result:", JSON.stringify(promptResult));
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          taskId: promptResult.prompt_id,
          message: "Image generation started"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate depth map
    if (action === 'generate_depth') {
      if (!imageUrl) {
        return new Response(
          JSON.stringify({ success: false, error: "Image URL is required for depth map generation" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Upload the image first
      let uploadedImageName: string;
      if (imageUrl.startsWith('data:')) {
        uploadedImageName = await uploadImageToComfyUI(comfyuiServerUrl, imageUrl);
      } else {
        throw new Error("Image must be provided as base64 data");
      }

      const workflow = buildDepthWorkflow(uploadedImageName);
      console.log("Submitting depth workflow:", JSON.stringify(workflow));

      const promptResponse = await fetch(`${comfyuiServerUrl}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: workflow }),
      });

      if (!promptResponse.ok) {
        const errorText = await promptResponse.text();
        console.error("ComfyUI depth error:", errorText);
        throw new Error(`ComfyUI depth generation failed: ${errorText}`);
      }

      const promptResult = await promptResponse.json();
      console.log("Depth prompt result:", JSON.stringify(promptResult));
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          taskId: promptResult.prompt_id,
          message: "Depth map generation started"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate normal map
    if (action === 'generate_normals') {
      if (!imageUrl) {
        return new Response(
          JSON.stringify({ success: false, error: "Image URL is required for normal map generation" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Upload the image first
      let uploadedImageName: string;
      if (imageUrl.startsWith('data:')) {
        uploadedImageName = await uploadImageToComfyUI(comfyuiServerUrl, imageUrl);
      } else {
        throw new Error("Image must be provided as base64 data");
      }

      const workflow = buildNormalWorkflow(uploadedImageName);
      console.log("Submitting normal workflow:", JSON.stringify(workflow));

      const promptResponse = await fetch(`${comfyuiServerUrl}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: workflow }),
      });

      if (!promptResponse.ok) {
        const errorText = await promptResponse.text();
        console.error("ComfyUI normal error:", errorText);
        throw new Error(`ComfyUI normal map generation failed: ${errorText}`);
      }

      const promptResult = await promptResponse.json();
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          taskId: promptResult.prompt_id,
          message: "Normal map generation started"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Style transfer
    if (action === 'style_transfer') {
      if (!imageUrl || !prompt) {
        return new Response(
          JSON.stringify({ success: false, error: "Image URL and style prompt are required for style transfer" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Upload the image first
      let uploadedImageName: string;
      if (imageUrl.startsWith('data:')) {
        uploadedImageName = await uploadImageToComfyUI(comfyuiServerUrl, imageUrl);
      } else {
        throw new Error("Image must be provided as base64 data");
      }

      const workflow = buildStyleTransferWorkflow(uploadedImageName, prompt, negativePrompt || '', cfg, steps, denoisingStrength);
      console.log("Submitting style transfer workflow");

      const promptResponse = await fetch(`${comfyuiServerUrl}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: workflow }),
      });

      if (!promptResponse.ok) {
        const errorText = await promptResponse.text();
        throw new Error(`ComfyUI style transfer failed: ${errorText}`);
      }

      const promptResult = await promptResponse.json();
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          taskId: promptResult.prompt_id,
          message: "Style transfer started"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upscale image
    if (action === 'upscale') {
      if (!imageUrl) {
        return new Response(
          JSON.stringify({ success: false, error: "Image URL is required for upscaling" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Upload the image first
      let uploadedImageName: string;
      if (imageUrl.startsWith('data:')) {
        uploadedImageName = await uploadImageToComfyUI(comfyuiServerUrl, imageUrl);
      } else {
        throw new Error("Image must be provided as base64 data");
      }

      const workflow = buildUpscaleWorkflow(uploadedImageName, upscaleFactor);
      console.log("Submitting upscale workflow");

      const promptResponse = await fetch(`${comfyuiServerUrl}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: workflow }),
      });

      if (!promptResponse.ok) {
        const errorText = await promptResponse.text();
        throw new Error(`ComfyUI upscale failed: ${errorText}`);
      }

      const promptResult = await promptResponse.json();
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          taskId: promptResult.prompt_id,
          message: "Upscaling started"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Remove background
    if (action === 'remove_background') {
      if (!imageUrl) {
        return new Response(
          JSON.stringify({ success: false, error: "Image URL is required for background removal" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Upload the image first
      let uploadedImageName: string;
      if (imageUrl.startsWith('data:')) {
        uploadedImageName = await uploadImageToComfyUI(comfyuiServerUrl, imageUrl);
      } else {
        throw new Error("Image must be provided as base64 data");
      }

      const workflow = buildRemoveBackgroundWorkflow(uploadedImageName);
      console.log("Submitting background removal workflow");

      const promptResponse = await fetch(`${comfyuiServerUrl}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: workflow }),
      });

      if (!promptResponse.ok) {
        const errorText = await promptResponse.text();
        throw new Error(`ComfyUI background removal failed: ${errorText}`);
      }

      const promptResult = await promptResponse.json();
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          taskId: promptResult.prompt_id,
          message: "Background removal started"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Run custom workflow
    if (action === 'run_custom_workflow') {
      if (!workflow) {
        return new Response(
          JSON.stringify({ success: false, error: "Workflow is required for custom workflow execution" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      console.log("Running custom workflow");

      // Determine the format and prepare the workflow
      let workflowToSubmit = workflow;
      
      // If the workflow has a 'nodes' property, it's in the UI format and needs conversion
      // ComfyUI API expects the "API format" (Save API in ComfyUI)
      if (workflow.nodes && Array.isArray(workflow.nodes)) {
        console.log("Workflow is in UI format - needs to be exported in API format");
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Please export your workflow using 'Save (API Format)' in ComfyUI. The uploaded workflow is in UI format which cannot be directly executed."
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Submit the custom workflow
      const promptResponse = await fetch(`${comfyuiServerUrl}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: workflowToSubmit }),
      });

      if (!promptResponse.ok) {
        const errorText = await promptResponse.text();
        console.error("ComfyUI custom workflow error:", errorText);
        throw new Error(`ComfyUI custom workflow failed: ${errorText}`);
      }

      const promptResult = await promptResponse.json();
      console.log("Custom workflow prompt result:", JSON.stringify(promptResult));
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          taskId: promptResult.prompt_id,
          message: "Custom workflow execution started"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get task status
    if (action === 'get_status') {
      if (!taskId) {
        return new Response(
          JSON.stringify({ success: false, error: "Task ID is required" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Check history for completed task
      const historyResponse = await fetch(`${comfyuiServerUrl}/history/${taskId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!historyResponse.ok) {
        // Task might still be queued or processing
        const queueResponse = await fetch(`${comfyuiServerUrl}/queue`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (queueResponse.ok) {
          const queueData = await queueResponse.json();
          const isInQueue = queueData.queue_running?.some((q: any) => q[1] === taskId) ||
                           queueData.queue_pending?.some((q: any) => q[1] === taskId);
          
          if (isInQueue) {
            return new Response(
              JSON.stringify({ 
                success: true, 
                status: 'processing',
                progress: 50
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            status: 'pending',
            progress: 10
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const historyData = await historyResponse.json();
      const taskHistory = historyData[taskId];

      if (!taskHistory) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            status: 'pending',
            progress: 10
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if completed
      if (taskHistory.outputs) {
        let imageUrls: string[] = [];

        for (const nodeId in taskHistory.outputs) {
          const nodeOutput = taskHistory.outputs[nodeId];
          
          // Check for image outputs
          if (nodeOutput.images) {
            for (const img of nodeOutput.images) {
              const imageUrl = `${comfyuiServerUrl}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || '')}&type=${encodeURIComponent(img.type || 'output')}`;
              imageUrls.push(imageUrl);
            }
          }
        }

        if (imageUrls.length > 0) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              status: 'completed',
              progress: 100,
              imageUrls
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Check for errors
      if (taskHistory.status?.status_str === 'error') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            status: 'failed',
            error: taskHistory.status?.messages?.[0] || 'Generation failed'
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          status: 'processing',
          progress: 70
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );

  } catch (error: unknown) {
    console.error("ComfyUI image generation error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// Build text-to-image or image-to-image workflow
interface ImageWorkflowParams {
  workflowType: string;
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  steps: number;
  cfg: number;
  seed: number;
  sampler: string;
  scheduler: string;
  denoisingStrength: number;
  imageUrl?: string;
  loraModels: Array<{ name: string; weight: number }>;
  controlnetImage?: string;
  controlnetType?: string;
  controlnetStrength: number;
}

function buildImageWorkflow(params: ImageWorkflowParams): Record<string, any> {
  const { 
    workflowType, 
    prompt, 
    negativePrompt, 
    width, 
    height, 
    steps, 
    cfg, 
    seed, 
    sampler, 
    scheduler,
    denoisingStrength,
    imageUrl,
    controlnetImage,
    controlnetType,
    controlnetStrength,
  } = params;

  const actualSeed = seed === -1 ? Math.floor(Math.random() * 1000000000) : seed;

  // Basic SDXL text-to-image workflow
  const baseWorkflow: Record<string, any> = {
    "1": {
      "class_type": "CheckpointLoaderSimple",
      "inputs": {
        "ckpt_name": "sd_xl_base_1.0.safetensors"
      }
    },
    "2": {
      "class_type": "CLIPTextEncode",
      "inputs": {
        "text": prompt,
        "clip": ["1", 1]
      }
    },
    "3": {
      "class_type": "CLIPTextEncode",
      "inputs": {
        "text": negativePrompt || "low quality, blurry, distorted",
        "clip": ["1", 1]
      }
    },
    "4": {
      "class_type": "EmptyLatentImage",
      "inputs": {
        "width": width,
        "height": height,
        "batch_size": 1
      }
    },
    "5": {
      "class_type": "KSampler",
      "inputs": {
        "model": ["1", 0],
        "positive": ["2", 0],
        "negative": ["3", 0],
        "latent_image": ["4", 0],
        "seed": actualSeed,
        "steps": steps,
        "cfg": cfg,
        "sampler_name": sampler,
        "scheduler": scheduler,
        "denoise": 1.0
      }
    },
    "6": {
      "class_type": "VAEDecode",
      "inputs": {
        "samples": ["5", 0],
        "vae": ["1", 2]
      }
    },
    "7": {
      "class_type": "SaveImage",
      "inputs": {
        "images": ["6", 0],
        "filename_prefix": "comfyui_output"
      }
    }
  };

  // If img2img, load image and adjust workflow
  if (workflowType === 'img2img' && imageUrl) {
    baseWorkflow["8"] = {
      "class_type": "LoadImage",
      "inputs": {
        "image": imageUrl
      }
    };
    baseWorkflow["9"] = {
      "class_type": "VAEEncode",
      "inputs": {
        "pixels": ["8", 0],
        "vae": ["1", 2]
      }
    };
    baseWorkflow["5"]["inputs"]["latent_image"] = ["9", 0];
    baseWorkflow["5"]["inputs"]["denoise"] = denoisingStrength;
    delete baseWorkflow["4"];
  }

  // Add ControlNet if specified
  if (controlnetImage && controlnetType) {
    // Map user-friendly type to actual controlnet file
    const controlnetFileMap: Record<string, string> = {
      'openpose': 'control-lora-openposeXL2-rank256.safetensors',
      'canny': 'control-lora-canny-rank256.safetensors',
      'depth': 'control-lora-depth-rank256.safetensors',
      'lineart': 'control-lora-sketch-rank256.safetensors',
    };
    
    const controlnetFile = controlnetFileMap[controlnetType] || controlnetType;
    
    baseWorkflow["10"] = {
      "class_type": "ControlNetLoader",
      "inputs": {
        "control_net_name": controlnetFile
      }
    };
    baseWorkflow["11"] = {
      "class_type": "LoadImage",
      "inputs": {
        "image": controlnetImage
      }
    };
    baseWorkflow["12"] = {
      "class_type": "ControlNetApply",
      "inputs": {
        "conditioning": ["2", 0],
        "control_net": ["10", 0],
        "image": ["11", 0],
        "strength": controlnetStrength
      }
    };
    baseWorkflow["5"]["inputs"]["positive"] = ["12", 0];
  }

  return baseWorkflow;
}

// Build depth map extraction workflow using comfyui_controlnet_aux MiDaS
function buildDepthWorkflow(imageName: string): Record<string, any> {
  // Using MiDaS from comfyui_controlnet_aux which is more compatible
  return {
    "1": {
      "class_type": "LoadImage",
      "inputs": {
        "image": imageName
      }
    },
    "2": {
      "class_type": "MiDaS-DepthMapPreprocessor",
      "inputs": {
        "image": ["1", 0],
        "a": 6.283185307179586,
        "bg_threshold": 0.1,
        "resolution": 512
      }
    },
    "3": {
      "class_type": "SaveImage",
      "inputs": {
        "images": ["2", 0],
        "filename_prefix": "depth_map"
      }
    }
  };
}

// Build normal map extraction workflow using comfyui_controlnet_aux
function buildNormalWorkflow(imageName: string): Record<string, any> {
  return {
    "1": {
      "class_type": "LoadImage",
      "inputs": {
        "image": imageName
      }
    },
    "2": {
      "class_type": "BAE-NormalMapPreprocessor",
      "inputs": {
        "image": ["1", 0],
        "resolution": 512
      }
    },
    "3": {
      "class_type": "SaveImage",
      "inputs": {
        "images": ["2", 0],
        "filename_prefix": "normal_map"
      }
    }
  };
}

// Build style transfer workflow (img2img with style prompt)
function buildStyleTransferWorkflow(
  imageName: string, 
  stylePrompt: string, 
  negativePrompt: string,
  cfg: number,
  steps: number,
  denoise: number
): Record<string, any> {
  return {
    "1": {
      "class_type": "CheckpointLoaderSimple",
      "inputs": {
        "ckpt_name": "sd_xl_base_1.0.safetensors"
      }
    },
    "2": {
      "class_type": "LoadImage",
      "inputs": {
        "image": imageName
      }
    },
    "3": {
      "class_type": "VAEEncode",
      "inputs": {
        "pixels": ["2", 0],
        "vae": ["1", 2]
      }
    },
    "4": {
      "class_type": "CLIPTextEncode",
      "inputs": {
        "text": stylePrompt,
        "clip": ["1", 1]
      }
    },
    "5": {
      "class_type": "CLIPTextEncode",
      "inputs": {
        "text": negativePrompt || "low quality, blurry, distorted",
        "clip": ["1", 1]
      }
    },
    "6": {
      "class_type": "KSampler",
      "inputs": {
        "model": ["1", 0],
        "positive": ["4", 0],
        "negative": ["5", 0],
        "latent_image": ["3", 0],
        "seed": Math.floor(Math.random() * 1000000000),
        "steps": steps,
        "cfg": cfg,
        "sampler_name": "euler",
        "scheduler": "normal",
        "denoise": denoise
      }
    },
    "7": {
      "class_type": "VAEDecode",
      "inputs": {
        "samples": ["6", 0],
        "vae": ["1", 2]
      }
    },
    "8": {
      "class_type": "SaveImage",
      "inputs": {
        "images": ["7", 0],
        "filename_prefix": "style_transfer"
      }
    }
  };
}

// Build upscale workflow using built-in upscaler
function buildUpscaleWorkflow(imageName: string, scaleFactor: number): Record<string, any> {
  // Use ImageScaleBy which is built-in to ComfyUI (no extra models needed)
  return {
    "1": {
      "class_type": "LoadImage",
      "inputs": {
        "image": imageName
      }
    },
    "2": {
      "class_type": "ImageScaleBy",
      "inputs": {
        "image": ["1", 0],
        "upscale_method": "lanczos",
        "scale_by": scaleFactor
      }
    },
    "3": {
      "class_type": "SaveImage",
      "inputs": {
        "images": ["2", 0],
        "filename_prefix": "upscaled"
      }
    }
  };
}

// Build background removal workflow
function buildRemoveBackgroundWorkflow(imageName: string): Record<string, any> {
  // Use the rembg node if available, otherwise use a simpler approach
  return {
    "1": {
      "class_type": "LoadImage",
      "inputs": {
        "image": imageName
      }
    },
    "2": {
      "class_type": "Image Remove Background (rembg)",
      "inputs": {
        "image": ["1", 0]
      }
    },
    "3": {
      "class_type": "SaveImage",
      "inputs": {
        "images": ["2", 0],
        "filename_prefix": "no_background"
      }
    }
  };
}
