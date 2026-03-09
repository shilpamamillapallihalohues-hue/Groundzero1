-- Create table for notification routing configuration
CREATE TABLE IF NOT EXISTS public.notification_routing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  source_role TEXT,
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.notification_routing ENABLE ROW LEVEL SECURITY;

-- Allow super users to manage notification routing
CREATE POLICY "Super users can manage notification routing"
ON public.notification_routing
FOR ALL
TO authenticated
USING (
  is_super_user(auth.uid())
);

-- Allow authenticated users to read active notification routing for their user
CREATE POLICY "Users can read their notification routing"
ON public.notification_routing
FOR SELECT
TO authenticated
USING (
  target_user_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX idx_notification_routing_type ON public.notification_routing(notification_type);
CREATE INDEX idx_notification_routing_target ON public.notification_routing(target_user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_notification_routing_updated_at
BEFORE UPDATE ON public.notification_routing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();