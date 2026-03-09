import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try { await requireAuth(req); } catch (e) { if (e instanceof Response) return e; throw e; }
    const { keyName } = await req.json();
    const apiKey = Deno.env.get(keyName);
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ valid: false, error: 'API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let valid = false;
    let error = '';

    // Test based on key type
    if (keyName === 'MESHY_API_KEY') {
      const response = await fetch('https://api.meshy.ai/openapi/v1/image-to-3d?pageSize=1', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      valid = response.ok;
      if (!valid) error = 'Invalid Meshy API key';
    } else if (keyName === 'GEMINI_API_KEY') {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      valid = response.ok;
      if (!valid) error = 'Invalid Gemini API key';
    } else if (keyName === 'DEEPMOTION_API_KEY') {
      // DeepMotion doesn't have a simple test endpoint, just verify key exists
      valid = apiKey.length > 10;
      if (!valid) error = 'Invalid DeepMotion API key format';
    } else if (keyName === 'TRIPO_API_KEY') {
      const response = await fetch('https://api.tripo3d.ai/v2/openapi/balance', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      valid = response.ok;
      if (!valid) error = 'Invalid Tripo API key';
    } else {
      error = 'Unknown key type';
    }

    return new Response(
      JSON.stringify({ valid, error: valid ? null : error }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error testing API key:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ valid: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
