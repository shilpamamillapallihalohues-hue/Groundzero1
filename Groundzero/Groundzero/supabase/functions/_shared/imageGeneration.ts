// Shared image generation utility supporting Scenecraft AI, Gemini AI, and ComfyUI Local

export interface ImageGenerationOptions {
  prompt: string;
  projectId?: string;
  referenceImages?: string[];
  width?: number;
  height?: number;
  steps?: number;
  cfg?: number;
  negativePrompt?: string;
}

export interface ImageGenerationResult {
  imageUrl: string | null;
  provider: 'lovable' | 'gemini' | 'comfyui';
  taskId?: string; // For ComfyUI async polling
  error?: string;
}

// Fetch the image generation provider setting for a project
export async function getImageProvider(supabase: any, projectId?: string): Promise<'lovable' | 'gemini' | 'comfyui'> {
  if (!projectId) return 'lovable';
  
  try {
    const { data } = await supabase
      .from('project_ai_settings')
      .select('image_generation_provider')
      .eq('project_id', projectId)
      .single();
    
    return (data?.image_generation_provider as 'lovable' | 'gemini' | 'comfyui') || 'lovable';
  } catch {
    return 'lovable';
  }
}

// Generate image using the configured provider
export async function generateImage(
  options: ImageGenerationOptions,
  provider: 'lovable' | 'gemini' | 'comfyui'
): Promise<ImageGenerationResult> {
  const { prompt, referenceImages, width, height, steps, cfg, negativePrompt } = options;
  
  if (provider === 'gemini') {
    return generateWithGemini(prompt, referenceImages);
  } else if (provider === 'comfyui') {
    return generateWithComfyUI(prompt, { width, height, steps, cfg, negativePrompt, referenceImages });
  } else {
    return generateWithLovable(prompt, referenceImages);
  }
}

// Generate image using Scenecraft AI Gateway (powered by Lovable)
async function generateWithLovable(
  prompt: string,
  referenceImages?: string[]
): Promise<ImageGenerationResult> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    return { imageUrl: null, provider: 'lovable', error: 'LOVABLE_API_KEY not configured' };
  }

  try {
    let messageContent: any;
    
    if (referenceImages && referenceImages.length > 0) {
      const contentParts: any[] = [{ type: 'text', text: prompt }];
      for (const imgUrl of referenceImages.slice(0, 4)) {
        contentParts.push({
          type: 'image_url',
          image_url: { url: imgUrl }
        });
      }
      messageContent = contentParts;
    } else {
      messageContent = prompt;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [{ role: 'user', content: messageContent }],
        modalities: ['image', 'text'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Scenecraft AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return { imageUrl: null, provider: 'lovable', error: 'Rate limit exceeded. Please try again later.' };
      }
      if (response.status === 402) {
        return { imageUrl: null, provider: 'lovable', error: 'AI credits exhausted. Please add credits.' };
      }
      return { imageUrl: null, provider: 'lovable', error: `Failed to generate image (${response.status}): ${errorText.slice(0, 200)}` };
    }

    const data = await response.json();
    console.log('AI response keys:', JSON.stringify({
      hasChoices: !!data.choices,
      choiceCount: data.choices?.length,
      hasMessage: !!data.choices?.[0]?.message,
      hasImages: !!data.choices?.[0]?.message?.images,
      imageCount: data.choices?.[0]?.message?.images?.length,
      finishReason: data.choices?.[0]?.finish_reason,
      contentPreview: typeof data.choices?.[0]?.message?.content === 'string' 
        ? data.choices[0].message.content.slice(0, 100) : 'N/A',
    }));
    
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (imageUrl) {
      return { imageUrl, provider: 'lovable' };
    }

    // First attempt returned no image - retry with a simplified prompt (under 500 chars)
    console.log('No image in first attempt, retrying with simplified prompt...');
    const simplifiedPrompt = prompt.length > 500 
      ? prompt.split('\n').filter(l => l.trim()).slice(0, 3).join('. ').slice(0, 480)
      : prompt;

    const retryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [{ role: 'user', content: `Generate a cinematic film storyboard frame: ${simplifiedPrompt}` }],
        modalities: ['image', 'text'],
      }),
    });

    if (retryResponse.ok) {
      const retryData = await retryResponse.json();
      const retryImageUrl = retryData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      console.log('Retry result - hasImage:', !!retryImageUrl);
      if (retryImageUrl) {
        return { imageUrl: retryImageUrl, provider: 'lovable' };
      }
    } else {
      const retryErr = await retryResponse.text();
      console.error('Retry also failed:', retryResponse.status, retryErr.slice(0, 200));
    }

    return { imageUrl: null, provider: 'lovable', error: 'No image was generated. The AI model may have refused due to content policy or prompt complexity. Try simplifying the scene description.' };
  } catch (error) {
    console.error('Scenecraft AI generation error:', error);
    return { imageUrl: null, provider: 'lovable', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Generate image using Gemini AI directly
async function generateWithGemini(
  prompt: string,
  referenceImages?: string[]
): Promise<ImageGenerationResult> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) {
    return { imageUrl: null, provider: 'gemini', error: 'GEMINI_API_KEY not configured' };
  }

  try {
    // Build the request parts
    const parts: any[] = [];
    
    // Add reference images if provided
    if (referenceImages && referenceImages.length > 0) {
      for (const imgUrl of referenceImages.slice(0, 4)) {
        // For base64 images
        if (imgUrl.startsWith('data:')) {
          const matches = imgUrl.match(/^data:(.+);base64,(.+)$/);
          if (matches) {
            parts.push({
              inline_data: {
                mime_type: matches[1],
                data: matches[2]
              }
            });
          }
        } else {
          // For URL images, fetch and convert to base64
          try {
            const imgResponse = await fetch(imgUrl);
            const imgBuffer = await imgResponse.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
            const contentType = imgResponse.headers.get('content-type') || 'image/png';
            parts.push({
              inline_data: {
                mime_type: contentType,
                data: base64
              }
            });
          } catch (e) {
            console.error('Failed to fetch reference image:', e);
          }
        }
      }
    }
    
    // Add the text prompt
    parts.push({ text: prompt });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE']
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      if (response.status === 429) {
        return { imageUrl: null, provider: 'gemini', error: 'Gemini rate limit exceeded.' };
      }
      return { imageUrl: null, provider: 'gemini', error: 'Failed to generate image with Gemini' };
    }

    const data = await response.json();
    
    // Extract image from Gemini response
    const candidates = data.candidates || [];
    for (const candidate of candidates) {
      const parts = candidate.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData) {
          const { mimeType, data: imageData } = part.inlineData;
          return { 
            imageUrl: `data:${mimeType};base64,${imageData}`,
            provider: 'gemini' 
          };
        }
      }
    }
    
    return { imageUrl: null, provider: 'gemini', error: 'No image in Gemini response' };
  } catch (error) {
    console.error('Gemini generation error:', error);
    return { imageUrl: null, provider: 'gemini', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Generate image using ComfyUI Local server
interface ComfyUIOptions {
  width?: number;
  height?: number;
  steps?: number;
  cfg?: number;
  negativePrompt?: string;
  referenceImages?: string[];
}

async function generateWithComfyUI(
  prompt: string,
  options: ComfyUIOptions
): Promise<ImageGenerationResult> {
  // ComfyUI requires server URL from localStorage on client side
  // For edge functions, we need to check if there's a stored server URL
  // This is a limitation - ComfyUI works best from client-side calls
  
  // For now, return an error indicating ComfyUI should be used from client
  // The actual ComfyUI generation is done directly from ComfyUI Studio page
  console.log('ComfyUI generation requested - this provider works best from client-side');
  
  return {
    imageUrl: null,
    provider: 'comfyui',
    error: 'ComfyUI Local requires direct client-side connection. Please use ComfyUI Studio or configure a server URL.'
  };
}

// Helper to poll ComfyUI for task completion (used by client-side code)
export async function pollComfyUITask(
  serverUrl: string,
  taskId: string,
  maxAttempts: number = 60,
  intervalMs: number = 2000
): Promise<{ imageUrls: string[]; error?: string }> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(r => setTimeout(r, intervalMs));
    
    try {
      const response = await fetch(`${serverUrl}/history/${taskId}`);
      if (!response.ok) continue;
      
      const historyData = await response.json();
      const taskHistory = historyData[taskId];
      
      if (taskHistory?.outputs) {
        const imageUrls: string[] = [];
        for (const nodeId in taskHistory.outputs) {
          const nodeOutput = taskHistory.outputs[nodeId];
          if (nodeOutput.images) {
            for (const img of nodeOutput.images) {
              const imageUrl = `${serverUrl}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || '')}&type=${encodeURIComponent(img.type || 'output')}`;
              imageUrls.push(imageUrl);
            }
          }
        }
        if (imageUrls.length > 0) {
          return { imageUrls };
        }
      }
      
      // Check for errors
      if (taskHistory?.status?.status_str === 'error') {
        return { imageUrls: [], error: taskHistory.status?.messages?.[0] || 'Generation failed' };
      }
    } catch (e) {
      console.error('Polling error:', e);
    }
  }
  
  return { imageUrls: [], error: 'Generation timed out' };
}
