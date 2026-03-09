// Shared authentication utility for edge functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

export interface AuthResult {
  user: { id: string; email?: string };
  supabase: ReturnType<typeof createClient>;
}

/**
 * Validates the JWT token from the Authorization header.
 * Returns the authenticated user and a supabase client scoped to that user.
 * Throws an error (returns a 401 Response) if authentication fails.
 */
export async function requireAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getClaims(token);

  if (error || !data?.claims) {
    throw new Response(
      JSON.stringify({ error: 'Invalid or expired authentication token' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return {
    user: { id: data.claims.sub as string, email: data.claims.email as string | undefined },
    supabase,
  };
}

/**
 * Validates authentication AND checks if the user is an admin.
 * Uses the is_admin database function.
 */
export async function requireAdmin(req: Request): Promise<AuthResult> {
  const auth = await requireAuth(req);

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: isAdmin } = await serviceClient.rpc('is_admin', { _user_id: auth.user.id });

  if (!isAdmin) {
    throw new Response(
      JSON.stringify({ error: 'Admin access required' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return auth;
}
