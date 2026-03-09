-- =====================================================
-- SCENECRAFT PIPELINE DATABASE SCHEMA UPDATE
-- Hard-gated pipeline system with full traceability
-- =====================================================

-- 1. ENHANCED ASSET STATUS ENUM
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_pipeline_status') THEN
    CREATE TYPE asset_pipeline_status AS ENUM (
      'created',
      'assigned',
      'in_progress',
      'hod_review',
      'internal_review',
      'director_review',
      'client_review',
      'approved',
      'rework_required',
      'completed'
    );
  END IF;
END $$;

-- 2. SHOTS TABLE
CREATE TABLE IF NOT EXISTS public.shots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
  shot_code TEXT NOT NULL,
  frame_start INTEGER DEFAULT 1,
  frame_end INTEGER DEFAULT 100,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'approved', 'final_locked')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(scene_id, shot_code)
);

-- 3. DEPARTMENT MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.department_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'artist' CHECK (role IN ('artist', 'hod', 'internal')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(department_id, user_id)
);

-- 4. ASSET ROUTING TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.asset_routing_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_type TEXT NOT NULL UNIQUE,
  routing_order JSONB NOT NULL DEFAULT '[]',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default routing templates
INSERT INTO public.asset_routing_templates (asset_type, routing_order, description) VALUES
  ('environment', '["3d_modeling", "texturing", "lighting", "lookdev", "shot_integration"]', 'Environment asset pipeline'),
  ('character', '["3d_modeling", "texturing", "rigging", "animation", "fx", "lighting"]', 'Character/Creature pipeline'),
  ('creature', '["3d_modeling", "texturing", "rigging", "animation", "fx", "lighting"]', 'Creature pipeline'),
  ('prop', '["3d_modeling", "texturing", "lookdev"]', 'Prop asset pipeline'),
  ('vehicle', '["3d_modeling", "texturing", "rigging", "fx", "lighting"]', 'Vehicle pipeline'),
  ('fx_element', '["fx_simulation", "lighting", "compositing"]', 'FX asset pipeline'),
  ('shot_animation', '["animation", "fx", "lighting", "compositing"]', 'Shot animation pipeline'),
  ('final_shot', '["compositing", "color", "sound", "final_output"]', 'Final shot pipeline')
ON CONFLICT (asset_type) DO NOTHING;

-- 5. ENHANCED PRODUCTION ASSETS
ALTER TABLE public.production_assets 
  ADD COLUMN IF NOT EXISTS pipeline_status TEXT DEFAULT 'created',
  ADD COLUMN IF NOT EXISTS routing_template_id UUID REFERENCES public.asset_routing_templates(id),
  ADD COLUMN IF NOT EXISTS current_department_index INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_from TEXT DEFAULT 'manual';

-- 6. APPROVALS TABLE
CREATE TABLE IF NOT EXISTS public.approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.production_assets(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.asset_versions(id),
  department_id UUID REFERENCES public.departments(id),
  approval_level TEXT NOT NULL CHECK (approval_level IN ('hod', 'internal', 'director', 'client')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  comments TEXT,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. APPROVAL LOGS TABLE (immutable audit)
CREATE TABLE IF NOT EXISTS public.approval_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  approval_id UUID NOT NULL REFERENCES public.approvals(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID NOT NULL REFERENCES public.profiles(id),
  performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  previous_status TEXT,
  new_status TEXT,
  metadata JSONB DEFAULT '{}'
);

-- 8. ASSET ROUTING HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.asset_routing_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.production_assets(id) ON DELETE CASCADE,
  from_department TEXT,
  to_department TEXT NOT NULL,
  from_department_index INTEGER,
  to_department_index INTEGER NOT NULL,
  moved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  moved_by TEXT NOT NULL DEFAULT 'system'
);

-- 9. ASSET COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.asset_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.production_assets(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.asset_versions(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  comment_text TEXT NOT NULL,
  comment_type TEXT DEFAULT 'note',
  parent_comment_id UUID REFERENCES public.asset_comments(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10. REWORK CYCLES TABLE
CREATE TABLE IF NOT EXISTS public.rework_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.production_assets(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id),
  department_name TEXT,
  cycle_number INTEGER NOT NULL DEFAULT 1,
  reason TEXT NOT NULL,
  triggered_by UUID NOT NULL REFERENCES public.profiles(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 11. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES public.profiles(id),
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 12. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  entity_type TEXT,
  entity_id UUID,
  read_status BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shots_project ON public.shots(project_id);
CREATE INDEX IF NOT EXISTS idx_shots_scene ON public.shots(scene_id);
CREATE INDEX IF NOT EXISTS idx_department_members_dept ON public.department_members(department_id);
CREATE INDEX IF NOT EXISTS idx_department_members_user ON public.department_members(user_id);
CREATE INDEX IF NOT EXISTS idx_approvals_asset ON public.approvals(asset_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON public.approvals(status);
CREATE INDEX IF NOT EXISTS idx_approval_logs_approval ON public.approval_logs(approval_id);
CREATE INDEX IF NOT EXISTS idx_routing_history_asset ON public.asset_routing_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_comments_asset ON public.asset_comments(asset_id);
CREATE INDEX IF NOT EXISTS idx_rework_cycles_asset ON public.rework_cycles(asset_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read_status);

-- Enable RLS
ALTER TABLE public.shots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_routing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_routing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rework_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shots
CREATE POLICY "shots_select" ON public.shots FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.project_assignments pa
    JOIN public.profiles p ON p.id = pa.user_id
    WHERE pa.project_id = shots.project_id AND p.user_id = auth.uid()
  ) OR public.is_admin(auth.uid()) OR public.is_super_user(auth.uid())
);

CREATE POLICY "shots_manage" ON public.shots FOR ALL USING (
  public.is_admin(auth.uid()) OR public.is_super_user(auth.uid()) OR public.can_approve(auth.uid())
);

-- RLS Policies for department_members
CREATE POLICY "dept_members_select" ON public.department_members FOR SELECT USING (true);
CREATE POLICY "dept_members_manage" ON public.department_members FOR ALL USING (
  public.is_admin(auth.uid()) OR public.is_super_user(auth.uid())
);

-- RLS Policies for asset_routing_templates
CREATE POLICY "routing_templates_select" ON public.asset_routing_templates FOR SELECT USING (true);
CREATE POLICY "routing_templates_manage" ON public.asset_routing_templates FOR ALL USING (
  public.is_admin(auth.uid()) OR public.is_super_user(auth.uid())
);

-- RLS Policies for approvals
CREATE POLICY "approvals_select" ON public.approvals FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.production_assets pa
    JOIN public.project_assignments pj ON pj.project_id = pa.project_id
    JOIN public.profiles p ON p.id = pj.user_id
    WHERE pa.id = approvals.asset_id AND p.user_id = auth.uid()
  ) OR public.is_admin(auth.uid()) OR public.is_super_user(auth.uid())
);

CREATE POLICY "approvals_insert" ON public.approvals FOR INSERT WITH CHECK (
  public.can_approve(auth.uid()) OR public.is_admin(auth.uid())
);

CREATE POLICY "approvals_update" ON public.approvals FOR UPDATE USING (
  public.can_approve(auth.uid()) OR public.is_admin(auth.uid())
);

-- RLS Policies for approval_logs (read-only)
CREATE POLICY "approval_logs_select" ON public.approval_logs FOR SELECT USING (true);
CREATE POLICY "approval_logs_insert" ON public.approval_logs FOR INSERT WITH CHECK (true);

-- RLS Policies for asset_routing_history
CREATE POLICY "routing_history_select" ON public.asset_routing_history FOR SELECT USING (true);
CREATE POLICY "routing_history_insert" ON public.asset_routing_history FOR INSERT WITH CHECK (true);

-- RLS Policies for asset_comments
CREATE POLICY "asset_comments_select" ON public.asset_comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.production_assets pa
    JOIN public.project_assignments pj ON pj.project_id = pa.project_id
    JOIN public.profiles p ON p.id = pj.user_id
    WHERE pa.id = asset_comments.asset_id AND p.user_id = auth.uid()
  ) OR public.is_admin(auth.uid())
);

CREATE POLICY "asset_comments_insert" ON public.asset_comments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND id = asset_comments.user_id)
);

-- RLS Policies for rework_cycles
CREATE POLICY "rework_cycles_select" ON public.rework_cycles FOR SELECT USING (true);
CREATE POLICY "rework_cycles_insert" ON public.rework_cycles FOR INSERT WITH CHECK (
  public.can_approve(auth.uid()) OR public.is_admin(auth.uid())
);

-- RLS Policies for audit_logs (admin only)
CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT USING (
  public.is_admin(auth.uid()) OR public.is_super_user(auth.uid())
);
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- RLS Policies for notifications
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND id = notifications.user_id)
);
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND id = notifications.user_id)
);
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT WITH CHECK (true);

-- FUNCTION: Auto-route asset after director approval
CREATE OR REPLACE FUNCTION public.auto_route_asset_after_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_asset RECORD;
  v_template RECORD;
  v_next_index INTEGER;
  v_next_department TEXT;
  v_routing_array TEXT[];
BEGIN
  IF NEW.status = 'approved' AND NEW.approval_level = 'director' THEN
    SELECT * INTO v_asset FROM public.production_assets WHERE id = NEW.asset_id;
    
    IF v_asset.routing_template_id IS NOT NULL THEN
      SELECT * INTO v_template FROM public.asset_routing_templates WHERE id = v_asset.routing_template_id;
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_template.routing_order)) INTO v_routing_array;
      
      v_next_index := COALESCE(v_asset.current_department_index, 0) + 1;
      
      IF v_next_index <= array_length(v_routing_array, 1) THEN
        v_next_department := v_routing_array[v_next_index];
        
        INSERT INTO public.asset_routing_history (
          asset_id, from_department, to_department, 
          from_department_index, to_department_index, moved_by
        ) VALUES (
          NEW.asset_id, 
          CASE WHEN v_asset.current_department_index > 0 THEN v_routing_array[v_asset.current_department_index] ELSE NULL END,
          v_next_department,
          v_asset.current_department_index,
          v_next_index,
          'system'
        );
        
        UPDATE public.production_assets
        SET current_department_index = v_next_index,
            pipeline_status = 'assigned',
            updated_at = now()
        WHERE id = NEW.asset_id;
      ELSE
        UPDATE public.production_assets
        SET pipeline_status = 'completed',
            updated_at = now()
        WHERE id = NEW.asset_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_auto_route_asset ON public.approvals;
CREATE TRIGGER trigger_auto_route_asset
  AFTER INSERT OR UPDATE ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.auto_route_asset_after_approval();

-- FUNCTION: Log approval actions
CREATE OR REPLACE FUNCTION public.log_approval_action()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.approval_logs (
    approval_id, action, performed_by, previous_status, new_status
  ) VALUES (
    NEW.id,
    CASE WHEN TG_OP = 'INSERT' THEN 'created' WHEN NEW.status != OLD.status THEN 'status_changed' ELSE 'updated' END,
    COALESCE(NEW.approved_by, (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)),
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
    NEW.status
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_log_approval ON public.approvals;
CREATE TRIGGER trigger_log_approval
  AFTER INSERT OR UPDATE ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.log_approval_action();

-- FUNCTION: Create notification helper
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID, p_type TEXT, p_title TEXT,
  p_message TEXT DEFAULT NULL, p_entity_type TEXT DEFAULT NULL, p_entity_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, entity_type, entity_id)
  VALUES (p_user_id, p_type, p_title, p_message, p_entity_type, p_entity_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_shots_timestamp ON public.shots;
CREATE TRIGGER update_shots_timestamp BEFORE UPDATE ON public.shots
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS update_asset_routing_templates_timestamp ON public.asset_routing_templates;
CREATE TRIGGER update_asset_routing_templates_timestamp BEFORE UPDATE ON public.asset_routing_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS update_asset_comments_timestamp ON public.asset_comments;
CREATE TRIGGER update_asset_comments_timestamp BEFORE UPDATE ON public.asset_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();