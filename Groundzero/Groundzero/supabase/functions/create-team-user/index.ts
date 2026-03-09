import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { requireAdmin } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SelectedRole {
  specific_role: string;
  phase: string;
}

interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  role: string;
  specificRole?: string;
  phase?: string;
  departmentId?: string | null;
  action?: string;
  userId?: string;
  profileId?: string;
  status?: string;
  isActive?: boolean;
  allRoles?: SelectedRole[];
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body: CreateUserRequest = await req.json();
    const { action, userId, profileId, email, password, fullName, role, specificRole, phase, departmentId, status, isActive } = body;

    // Handle password update action
    if (action === 'update_password' && userId && password) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password }
      );

      if (updateError) {
        console.error("Error updating password:", updateError);
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle role update action
    if (action === 'update_role' && (userId || profileId)) {
      console.log("Updating role for user:", { userId, profileId, role, specificRole, phase, fullName, status, isActive, departmentId, allRoles: body.allRoles });
      
      // Build update object
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      
      if (fullName !== undefined) updateData.full_name = fullName;
      if (role !== undefined) updateData.role = role;
      if (specificRole !== undefined) updateData.specific_role = specificRole;
      if (phase !== undefined) updateData.phase = phase;
      if (status !== undefined) updateData.status = status;
      if (isActive !== undefined) updateData.is_active = isActive;
      if (departmentId !== undefined) updateData.department_id = departmentId;

      // Update profile - try by profileId first, then by userId
      let profileError;
      if (profileId) {
        const result = await supabaseAdmin
          .from('profiles')
          .update(updateData)
          .eq('id', profileId);
        profileError = result.error;
      } else if (userId) {
        const result = await supabaseAdmin
          .from('profiles')
          .update(updateData)
          .eq('user_id', userId);
        profileError = result.error;
      }

      if (profileError) {
        console.error("Error updating profile:", profileError);
        return new Response(
          JSON.stringify({ error: profileError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Handle multi-role support - update user_specific_roles table
      const allRoles = body.allRoles || [];
      if (userId && allRoles.length > 0) {
        console.log("Updating user_specific_roles for user:", userId, allRoles);
        
        // Delete existing roles
        const { error: deleteError } = await supabaseAdmin
          .from('user_specific_roles')
          .delete()
          .eq('user_id', userId);
        
        if (deleteError) {
          console.error("Error deleting existing user_specific_roles:", deleteError);
        }
        
        // Insert new roles
        const rolesToInsert = allRoles.map((r: SelectedRole) => ({
          user_id: userId,
          specific_role: r.specific_role,
          phase: r.phase,
        }));
        
        const { error: insertError } = await supabaseAdmin
          .from('user_specific_roles')
          .insert(rolesToInsert);
        
        if (insertError) {
          console.error("Error inserting user_specific_roles:", insertError);
        } else {
          console.log("Successfully updated user_specific_roles");
        }
      }

      // If role is super_user, also update user_roles table to make them admin
      if (role === 'super_user' && userId) {
        // Check if user already has a role entry
        const { data: existingRole, error: fetchError } = await supabaseAdmin
          .from('user_roles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error("Error fetching user role:", fetchError);
        }

        if (existingRole) {
          // Update existing role to admin
          const { error: roleError } = await supabaseAdmin
            .from('user_roles')
            .update({ role: 'admin' })
            .eq('user_id', userId);
          
          if (roleError) {
            console.error("Error updating user_roles:", roleError);
          }
        } else {
          // Insert new admin role
          const { error: insertError } = await supabaseAdmin
            .from('user_roles')
            .insert({ user_id: userId, role: 'admin' });
          
          if (insertError) {
            console.error("Error inserting user_roles:", insertError);
          }
        }
      } else if (userId && role !== 'super_user') {
        // If role is not super_user, make sure they're not admin in user_roles
        const { data: existingRole, error: fetchError } = await supabaseAdmin
          .from('user_roles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (!fetchError && existingRole) {
          // Update to regular user role
          const { error: roleError } = await supabaseAdmin
            .from('user_roles')
            .update({ role: 'user' })
            .eq('user_id', userId);
          
          if (roleError) {
            console.error("Error updating user_roles to user:", roleError);
          }
        }
      }

      console.log("Successfully updated role for user");
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle user creation (default action)
    if (!email || !password || !fullName || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the user using admin API
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        full_name: fullName,
        role: role, // Dashboard role for routing
        specific_role: specificRole || role, // Specific job title
        phase: phase || 'production',
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // The profile will be created by the trigger, but we need to update the role and department
    // Wait a moment for the trigger to execute
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update the profile with the correct role and department
    const updateData: Record<string, any> = { 
      role: role,  // Dashboard role for routing
      specific_role: specificRole || role, // Specific job title
      phase: phase || 'production',
    };
    if (departmentId) {
      updateData.department_id = departmentId;
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('user_id', userData.user.id);

    if (profileError) {
      console.error("Error updating profile:", profileError);
    }

    // If role is super_user, add them to user_roles as admin
    if (role === 'super_user') {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: userData.user.id, role: 'admin' });
      
      if (roleError) {
        console.error("Error inserting user_roles:", roleError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { 
          id: userData.user.id, 
          email: userData.user.email 
        } 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in create-team-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});