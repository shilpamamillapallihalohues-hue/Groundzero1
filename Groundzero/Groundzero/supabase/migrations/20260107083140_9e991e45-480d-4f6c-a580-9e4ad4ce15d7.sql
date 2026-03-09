-- Create asset workflow status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_workflow_status') THEN
        CREATE TYPE asset_workflow_status AS ENUM (
            'not_started',
            'in_progress',
            'internal_review',
            'director_review',
            'client_review',
            'changes_requested',
            'approved'
        );
    END IF;
END$$;

-- Create pipeline routing configuration table (Source of Truth for routing)
CREATE TABLE IF NOT EXISTS public.pipeline_routing_config (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_type TEXT NOT NULL,
    department_order TEXT[] NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(asset_type)
);

-- Enable RLS
ALTER TABLE public.pipeline_routing_config ENABLE ROW LEVEL SECURITY;

-- Only super_user can modify routing config
CREATE POLICY "Super users can manage routing config"
ON public.pipeline_routing_config
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.role = 'super_user'
    )
);

-- Everyone can view routing config
CREATE POLICY "All authenticated users can view routing config"
ON public.pipeline_routing_config
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create asset department tracking table
CREATE TABLE IF NOT EXISTS public.asset_department_status (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_id UUID NOT NULL REFERENCES public.production_assets(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    current_department TEXT NOT NULL,
    workflow_status TEXT NOT NULL DEFAULT 'not_started',
    department_order_index INTEGER NOT NULL DEFAULT 0,
    assigned_artist_id UUID REFERENCES public.profiles(id),
    assigned_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(asset_id)
);

-- Enable RLS
ALTER TABLE public.asset_department_status ENABLE ROW LEVEL SECURITY;

-- View policies for asset department status
CREATE POLICY "Users can view assets in their department"
ON public.asset_department_status
FOR SELECT
USING (
    auth.uid() IS NOT NULL AND (
        -- Super users, producers, directors, production managers see all
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role IN ('super_user', 'producer', 'director', 'production_manager')
        )
        OR
        -- HODs and artists see their department assets
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN departments d ON p.department_id = d.id
            WHERE p.user_id = auth.uid()
            AND d.name = current_department
        )
        OR
        -- Assigned artist can see their asset
        assigned_artist_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
);

-- Update policy for artists (only their assigned assets)
CREATE POLICY "Artists can update their assigned assets"
ON public.asset_department_status
FOR UPDATE
USING (
    assigned_artist_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.role IN ('super_user', 'producer', 'production_manager', 'hod')
    )
);

-- Insert policy
CREATE POLICY "Managers can insert asset department status"
ON public.asset_department_status
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.role IN ('super_user', 'producer', 'production_manager')
    )
);

-- Create department approval log table
CREATE TABLE IF NOT EXISTS public.department_approval_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_id UUID NOT NULL REFERENCES public.production_assets(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    department TEXT NOT NULL,
    approval_type TEXT NOT NULL, -- 'internal', 'director', 'client'
    status TEXT NOT NULL, -- 'approved', 'rejected', 'changes_requested'
    reviewer_id UUID REFERENCES public.profiles(id),
    notes TEXT,
    version_number INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.department_approval_log ENABLE ROW LEVEL SECURITY;

-- View policy for approval log
CREATE POLICY "Authenticated users can view approval logs"
ON public.department_approval_log
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Insert policy for approval log
CREATE POLICY "Reviewers can create approval logs"
ON public.department_approval_log
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.role IN ('super_user', 'producer', 'director', 'hod', 'client')
    )
);

-- Insert default routing configurations
INSERT INTO public.pipeline_routing_config (asset_type, department_order) VALUES
    ('environment', ARRAY['3D Modelling', 'Texturing', 'Lighting', 'Lookdev', 'Shot Integration']),
    ('character', ARRAY['3D Modelling', 'Texturing', 'Rigging', 'Animation', 'FX', 'Lighting']),
    ('creature', ARRAY['3D Modelling', 'Texturing', 'Rigging', 'Animation', 'FX', 'Lighting']),
    ('prop', ARRAY['3D Modelling', 'Texturing', 'Lookdev']),
    ('vehicle', ARRAY['3D Modelling', 'Texturing', 'Rigging', 'FX', 'Lighting']),
    ('fx_element', ARRAY['FX', 'Lighting', 'Compositing']),
    ('shot_animation', ARRAY['Animation', 'FX', 'Lighting', 'Compositing']),
    ('final_shot', ARRAY['Compositing', 'Color', 'Sound', 'Final Output'])
ON CONFLICT (asset_type) DO NOTHING;

-- Create function to auto-route asset to next department
CREATE OR REPLACE FUNCTION public.route_asset_to_next_department(
    p_asset_id UUID,
    p_approved_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_status RECORD;
    v_routing RECORD;
    v_next_department TEXT;
    v_next_index INTEGER;
    v_asset_type TEXT;
BEGIN
    -- Get current asset status
    SELECT ads.*, pa.category
    INTO v_current_status
    FROM asset_department_status ads
    JOIN production_assets pa ON pa.id = ads.asset_id
    WHERE ads.asset_id = p_asset_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Asset not found');
    END IF;
    
    -- Get routing config for this asset type
    SELECT * INTO v_routing
    FROM pipeline_routing_config
    WHERE asset_type = v_current_status.category::text
    AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'No routing config found');
    END IF;
    
    -- Calculate next department
    v_next_index := v_current_status.department_order_index + 1;
    
    IF v_next_index > array_length(v_routing.department_order, 1) THEN
        -- Asset completed all departments
        UPDATE asset_department_status
        SET workflow_status = 'approved',
            completed_at = now(),
            updated_at = now()
        WHERE asset_id = p_asset_id;
        
        RETURN jsonb_build_object(
            'success', true, 
            'completed', true,
            'message', 'Asset completed all departments'
        );
    END IF;
    
    v_next_department := v_routing.department_order[v_next_index];
    
    -- Update asset to next department
    UPDATE asset_department_status
    SET current_department = v_next_department,
        department_order_index = v_next_index,
        workflow_status = 'not_started',
        assigned_artist_id = NULL,
        assigned_at = NULL,
        started_at = NULL,
        completed_at = NULL,
        updated_at = now()
    WHERE asset_id = p_asset_id;
    
    -- Log the approval
    INSERT INTO department_approval_log (
        asset_id, project_id, department, approval_type, status, reviewer_id
    ) VALUES (
        p_asset_id,
        v_current_status.project_id,
        v_current_status.current_department,
        'director',
        'approved',
        p_approved_by
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'completed', false,
        'next_department', v_next_department,
        'message', 'Asset routed to ' || v_next_department
    );
END;
$$;

-- Create trigger to update timestamps
CREATE OR REPLACE FUNCTION public.update_asset_department_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_asset_department_status_updated_at
BEFORE UPDATE ON public.asset_department_status
FOR EACH ROW
EXECUTE FUNCTION public.update_asset_department_status_updated_at();

CREATE TRIGGER update_pipeline_routing_config_updated_at
BEFORE UPDATE ON public.pipeline_routing_config
FOR EACH ROW
EXECUTE FUNCTION public.update_asset_department_status_updated_at();