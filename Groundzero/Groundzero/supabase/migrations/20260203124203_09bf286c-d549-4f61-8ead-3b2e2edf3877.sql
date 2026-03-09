-- Create system_settings table for global configuration
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read system settings
CREATE POLICY "Anyone can read system settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (true);

-- Policy: Only admins can modify settings
CREATE POLICY "Admins can modify system settings"
ON public.system_settings
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Insert default 3D engine setting
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES (
  '3d_engine_config',
  '{"default_engine": "tripo", "comfyui_enabled": true, "comfyui_url": null, "meshy_enabled": true, "tripo_enabled": true}',
  'Global 3D model generation engine configuration'
);

-- Create trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();