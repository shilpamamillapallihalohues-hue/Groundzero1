import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAdmin } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require admin authentication
    try {
      await requireAdmin(req);
    } catch (e) {
      if (e instanceof Response) return e;
      throw e;
    }

    const { keyName, keyValue } = await req.json();

    // Validate key name
    const allowedKeys = ['MESHY_API_KEY', 'GEMINI_API_KEY', 'DEEPMOTION_API_KEY', 'TRIPO_API_KEY'];
    if (!allowedKeys.includes(keyName)) {
      throw new Error('Invalid key name');
    }

    // Note: In a production environment, you would use Supabase Vault or 
    // a secrets management service. For now, we'll store in a secure table.
    // The actual secret storage happens through the Scenecraft secrets system.
    
    // This endpoint validates the request - the actual key storage
    // should be done through the Scenecraft secrets management UI
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'To save API keys, please use the Scenecraft secrets management. Go to Settings → Secrets in your Scenecraft dashboard.',
        keyName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error saving API key:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
