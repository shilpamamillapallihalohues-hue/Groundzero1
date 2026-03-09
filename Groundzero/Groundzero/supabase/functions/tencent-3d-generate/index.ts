import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TencentCredentials {
  secretId: string;
  secretKey: string;
  region?: string;
}

interface GenerateRequest {
  action: 'generate_3d' | 'get_status' | 'test_connection';
  imageUrl?: string;
  imageBase64?: string;
  modelName?: string;
  taskId?: string;
  outputFormat?: 'glb' | 'obj';
}

// Helper function to compute HMAC-SHA256
async function hmacSha256(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
}

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const msgBuffer = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function signRequest(
  secretId: string,
  secretKey: string,
  service: string,
  host: string,
  action: string,
  payload: string,
  region: string
): Promise<Record<string, string>> {
  const encoder = new TextEncoder();
  
  async function hmac(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  }

  async function hash(message: string): Promise<string> {
    const msgBuffer = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function toHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().split('T')[0];

  const httpRequestMethod = 'POST';
  const canonicalUri = '/';
  const canonicalQueryString = '';
  const contentType = 'application/json';
  const hashedPayload = await hash(payload);
  
  const canonicalHeaders = 
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-tc-action:${action.toLowerCase()}\n`;
  
  const signedHeaders = 'content-type;host;x-tc-action';
  
  const canonicalRequest = 
    `${httpRequestMethod}\n` +
    `${canonicalUri}\n` +
    `${canonicalQueryString}\n` +
    `${canonicalHeaders}\n` +
    `${signedHeaders}\n` +
    `${hashedPayload}`;

  const algorithm = 'TC3-HMAC-SHA256';
  const credentialScope = `${date}/${service}/tc3_request`;
  const hashedCanonicalRequest = await hash(canonicalRequest);
  
  const stringToSign = 
    `${algorithm}\n` +
    `${timestamp}\n` +
    `${credentialScope}\n` +
    `${hashedCanonicalRequest}`;

  // Derive signing key
  const secretDate = await hmac(encoder.encode('TC3' + secretKey).buffer as ArrayBuffer, date);
  const secretService = await hmac(secretDate, service);
  const secretSigning = await hmac(secretService, 'tc3_request');
  const signatureBytes = await hmac(secretSigning, stringToSign);
  const signature = toHex(signatureBytes);

  const authorization = 
    `${algorithm} ` +
    `Credential=${secretId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, ` +
    `Signature=${signature}`;

  return {
    'Authorization': authorization,
    'Content-Type': contentType,
    'Host': host,
    'X-TC-Action': action,
    'X-TC-Timestamp': timestamp.toString(),
    'X-TC-Version': '2024-01-25',
    'X-TC-Region': region,
  };
}

async function callTencentAPI(
  credentials: TencentCredentials,
  action: string,
  payload: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const service = 'hunyuan';
  const host = 'hunyuan.tencentcloudapi.com';
  const region = credentials.region || 'ap-guangzhou';
  const payloadStr = JSON.stringify(payload);

  try {
    const headers = await signRequest(
      credentials.secretId,
      credentials.secretKey,
      service,
      host,
      action,
      payloadStr,
      region
    );

    console.log(`Calling Tencent API: ${action}`);
    
    const response = await fetch(`https://${host}`, {
      method: 'POST',
      headers,
      body: payloadStr,
    });

    const result = await response.json();
    console.log('Tencent API response:', JSON.stringify(result).substring(0, 500));

    if (result.Response?.Error) {
      return {
        success: false,
        error: `${result.Response.Error.Code}: ${result.Response.Error.Message}`,
      };
    }

    return { success: true, data: result.Response };
  } catch (error) {
    console.error('Tencent API error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try { await requireAuth(req); } catch (e) { if (e instanceof Response) return e; throw e; }
    const body: GenerateRequest = await req.json();
    const { action } = body;

    // Get Tencent credentials from environment
    const secretId = Deno.env.get('TENCENT_SECRET_ID');
    const secretKey = Deno.env.get('TENCENT_SECRET_KEY');
    const region = Deno.env.get('TENCENT_REGION') || 'ap-guangzhou';

    if (!secretId || !secretKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Tencent API credentials not configured. Please add TENCENT_SECRET_ID and TENCENT_SECRET_KEY in External Tools.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const credentials: TencentCredentials = { secretId, secretKey, region };

    if (action === 'test_connection') {
      // Test connection by calling a simple API
      console.log('Testing Tencent connection...');
      
      // Try to describe quotas or a simple endpoint
      const result = await callTencentAPI(credentials, 'QueryHunyuanImageJob', {
        JobId: 'test-connection-check'
      });
      
      // Even if the job doesn't exist, a proper error means credentials work
      if (result.success || (result.error && !result.error.includes('AuthFailure'))) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            connected: true,
            message: 'Tencent Cloud API credentials verified' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          connected: false,
          error: result.error || 'Failed to verify credentials' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'generate_3d') {
      const { imageUrl, imageBase64, modelName, outputFormat = 'glb' } = body;

      if (!imageUrl && !imageBase64) {
        return new Response(
          JSON.stringify({ success: false, error: 'Image URL or base64 data is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Prepare the image input
      let imageInput: string;
      
      if (imageBase64) {
        // Remove data URL prefix if present
        imageInput = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      } else if (imageUrl) {
        // Download image and convert to base64
        console.log('Downloading image from URL:', imageUrl);
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.status}`);
        }
        const imageBuffer = await imageResponse.arrayBuffer();
        imageInput = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
      } else {
        throw new Error('No image provided');
      }

      // Submit Image-to-3D job to Tencent Hunyuan
      console.log('Submitting 3D generation job to Tencent...');
      
      const submitResult = await callTencentAPI(credentials, 'SubmitHunyuan3DJob', {
        InputImage: imageInput,
        OutputFormat: outputFormat.toUpperCase(),
        ModelName: modelName || 'generated_model',
      });

      if (!submitResult.success) {
        return new Response(
          JSON.stringify({ success: false, error: submitResult.error }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      const taskId = (submitResult.data as { JobId?: string })?.JobId;
      
      if (!taskId) {
        return new Response(
          JSON.stringify({ success: false, error: 'No task ID returned from Tencent API' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      console.log('3D generation job submitted, task ID:', taskId);

      return new Response(
        JSON.stringify({
          success: true,
          taskId,
          status: 'submitted',
          message: '3D generation job submitted to Tencent Cloud',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get_status') {
      const { taskId } = body;

      if (!taskId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Task ID is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Query job status
      const statusResult = await callTencentAPI(credentials, 'QueryHunyuan3DJob', {
        JobId: taskId,
      });

      if (!statusResult.success) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            status: 'failed',
            error: statusResult.error 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const jobData = statusResult.data as {
        Status?: string;
        Progress?: number;
        ResultUrl?: string;
        ThumbnailUrl?: string;
        ErrorMessage?: string;
      };

      // Map Tencent status to our status format
      let status: string;
      let progress = jobData.Progress || 0;

      switch (jobData.Status?.toLowerCase()) {
        case 'waiting':
        case 'queued':
          status = 'queued';
          progress = 5;
          break;
        case 'running':
        case 'processing':
          status = 'running';
          progress = Math.max(10, Math.min(90, progress));
          break;
        case 'success':
        case 'completed':
          status = 'completed';
          progress = 100;
          break;
        case 'failed':
        case 'error':
          status = 'failed';
          break;
        default:
          status = 'running';
      }

      const response: Record<string, unknown> = {
        success: true,
        status,
        progress,
        message: `Job ${status}`,
      };

      if (status === 'completed' && jobData.ResultUrl) {
        response.glbUrl = jobData.ResultUrl;
        response.thumbnailUrl = jobData.ThumbnailUrl || null;
        response.modelUrls = { glb: jobData.ResultUrl };
      }

      if (status === 'failed') {
        response.error = jobData.ErrorMessage || 'Generation failed';
      }

      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error) {
    console.error('Error in tencent-3d-generate:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
