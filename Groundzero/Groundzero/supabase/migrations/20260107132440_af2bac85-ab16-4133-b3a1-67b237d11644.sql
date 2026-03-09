
-- Storage configurations table
CREATE TABLE public.storage_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  storage_name TEXT NOT NULL,
  storage_type TEXT NOT NULL CHECK (storage_type IN ('local', 'shared', 'cloud')),
  base_path TEXT,
  mount_path TEXT,
  protocol TEXT CHECK (protocol IN ('smb', 'nfs', NULL)),
  cloud_provider TEXT CHECK (cloud_provider IN ('aws_s3', 'gcp', 'azure', NULL)),
  bucket_name TEXT,
  region TEXT,
  access_key_encrypted TEXT,
  secret_key_encrypted TEXT,
  username TEXT,
  is_active BOOLEAN DEFAULT true,
  last_tested_at TIMESTAMP WITH TIME ZONE,
  last_test_status TEXT CHECK (last_test_status IN ('healthy', 'warning', 'error', NULL)),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Project storage mappings
CREATE TABLE public.project_storage_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  storage_id UUID NOT NULL REFERENCES public.storage_configurations(id),
  folder_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  UNIQUE(project_id)
);

-- Render farm nodes
CREATE TABLE public.render_farm_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  node_name TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  hostname TEXT,
  os_type TEXT CHECK (os_type IN ('windows', 'linux', 'macos')),
  render_software TEXT[] DEFAULT '{}',
  cpu_count INTEGER,
  gpu_count INTEGER,
  status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'busy', 'error')),
  last_heartbeat TIMESTAMP WITH TIME ZONE,
  cpu_usage DECIMAL(5,2),
  ram_usage DECIMAL(5,2),
  disk_usage DECIMAL(5,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Render queue settings
CREATE TABLE public.render_queue_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  max_concurrent_jobs INTEGER DEFAULT 5,
  priority_rules JSONB DEFAULT '{}',
  department_overrides JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Tool configurations
CREATE TABLE public.tool_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_name TEXT NOT NULL,
  executable_path TEXT NOT NULL,
  version TEXT,
  environment_variables JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_tested_at TIMESTAMP WITH TIME ZONE,
  last_test_status TEXT CHECK (last_test_status IN ('healthy', 'warning', 'error', NULL)),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Infrastructure access rules
CREATE TABLE public.infrastructure_access_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('storage', 'render_farm', 'tools')),
  department_id UUID REFERENCES public.departments(id),
  role TEXT,
  can_read BOOLEAN DEFAULT false,
  can_write BOOLEAN DEFAULT false,
  can_execute BOOLEAN DEFAULT false,
  upload_limit_mb INTEGER,
  download_limit_mb INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Infrastructure logs
CREATE TABLE public.infrastructure_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  log_type TEXT NOT NULL CHECK (log_type IN ('storage', 'render', 'permission', 'connection', 'system')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  entity_type TEXT,
  entity_id UUID,
  performed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.storage_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_storage_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.render_farm_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.render_queue_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infrastructure_access_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infrastructure_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin only for modifications
CREATE POLICY "Admins can manage storage configurations"
ON public.storage_configurations FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage project storage mappings"
ON public.project_storage_mappings FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage render farm nodes"
ON public.render_farm_nodes FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage render queue settings"
ON public.render_queue_settings FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage tool configurations"
ON public.tool_configurations FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage infrastructure access rules"
ON public.infrastructure_access_rules FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view infrastructure logs"
ON public.infrastructure_logs FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert infrastructure logs"
ON public.infrastructure_logs FOR INSERT
WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_storage_configurations_updated_at
BEFORE UPDATE ON public.storage_configurations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_storage_mappings_updated_at
BEFORE UPDATE ON public.project_storage_mappings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_render_farm_nodes_updated_at
BEFORE UPDATE ON public.render_farm_nodes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tool_configurations_updated_at
BEFORE UPDATE ON public.tool_configurations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default render queue settings
INSERT INTO public.render_queue_settings (max_concurrent_jobs) VALUES (5);
