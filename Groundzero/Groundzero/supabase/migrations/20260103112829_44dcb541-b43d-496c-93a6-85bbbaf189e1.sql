-- Create work_employees table (can optionally link to team profiles)
CREATE TABLE public.work_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  department TEXT,
  designation TEXT,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create work_tasks table
CREATE TABLE public.work_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  employee_id UUID REFERENCES public.work_employees(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'on_hold', 'cancelled')),
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create work_progress_reports table
CREATE TABLE public.work_progress_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.work_tasks(id) ON DELETE CASCADE NOT NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  progress_notes TEXT NOT NULL,
  percentage_complete INTEGER DEFAULT 0 CHECK (percentage_complete >= 0 AND percentage_complete <= 100),
  image_urls TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create storage bucket for work progress images
INSERT INTO storage.buckets (id, name, public) VALUES ('work-progress-images', 'work-progress-images', true);

-- Enable RLS on all tables
ALTER TABLE public.work_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_progress_reports ENABLE ROW LEVEL SECURITY;

-- Create function to check if user has work tracking access
CREATE OR REPLACE FUNCTION public.has_work_tracking_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin(_user_id) OR EXISTS (
    SELECT 1 FROM public.page_permissions
    WHERE user_id = _user_id
      AND page_key = 'work-tracking'
      AND can_access = true
  )
$$;

-- RLS Policies for work_employees
CREATE POLICY "Users with work tracking access can view employees"
ON public.work_employees FOR SELECT
USING (public.has_work_tracking_access(auth.uid()));

CREATE POLICY "Users with work tracking access can create employees"
ON public.work_employees FOR INSERT
WITH CHECK (public.has_work_tracking_access(auth.uid()));

CREATE POLICY "Users with work tracking access can update employees"
ON public.work_employees FOR UPDATE
USING (public.has_work_tracking_access(auth.uid()));

CREATE POLICY "Users with work tracking access can delete employees"
ON public.work_employees FOR DELETE
USING (public.has_work_tracking_access(auth.uid()));

-- RLS Policies for work_tasks
CREATE POLICY "Users with work tracking access can view tasks"
ON public.work_tasks FOR SELECT
USING (public.has_work_tracking_access(auth.uid()));

CREATE POLICY "Users with work tracking access can create tasks"
ON public.work_tasks FOR INSERT
WITH CHECK (public.has_work_tracking_access(auth.uid()));

CREATE POLICY "Users with work tracking access can update tasks"
ON public.work_tasks FOR UPDATE
USING (public.has_work_tracking_access(auth.uid()));

CREATE POLICY "Users with work tracking access can delete tasks"
ON public.work_tasks FOR DELETE
USING (public.has_work_tracking_access(auth.uid()));

-- RLS Policies for work_progress_reports
CREATE POLICY "Users with work tracking access can view reports"
ON public.work_progress_reports FOR SELECT
USING (public.has_work_tracking_access(auth.uid()));

CREATE POLICY "Users with work tracking access can create reports"
ON public.work_progress_reports FOR INSERT
WITH CHECK (public.has_work_tracking_access(auth.uid()));

CREATE POLICY "Users with work tracking access can update reports"
ON public.work_progress_reports FOR UPDATE
USING (public.has_work_tracking_access(auth.uid()));

CREATE POLICY "Users with work tracking access can delete reports"
ON public.work_progress_reports FOR DELETE
USING (public.has_work_tracking_access(auth.uid()));

-- Storage policies for work-progress-images bucket
CREATE POLICY "Users with work tracking access can view images"
ON storage.objects FOR SELECT
USING (bucket_id = 'work-progress-images' AND public.has_work_tracking_access(auth.uid()));

CREATE POLICY "Users with work tracking access can upload images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'work-progress-images' AND public.has_work_tracking_access(auth.uid()));

CREATE POLICY "Users with work tracking access can update images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'work-progress-images' AND public.has_work_tracking_access(auth.uid()));

CREATE POLICY "Users with work tracking access can delete images"
ON storage.objects FOR DELETE
USING (bucket_id = 'work-progress-images' AND public.has_work_tracking_access(auth.uid()));

-- Add triggers for updated_at
CREATE TRIGGER update_work_employees_updated_at
BEFORE UPDATE ON public.work_employees
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_work_tasks_updated_at
BEFORE UPDATE ON public.work_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_work_progress_reports_updated_at
BEFORE UPDATE ON public.work_progress_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();