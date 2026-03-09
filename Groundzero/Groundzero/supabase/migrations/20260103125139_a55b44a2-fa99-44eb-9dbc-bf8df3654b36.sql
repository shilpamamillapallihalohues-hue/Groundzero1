-- Create departments table first
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  team_lead_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- RLS policies for departments
CREATE POLICY "Authenticated users can view departments"
ON public.departments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage departments"
ON public.departments FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Add department_id to profiles
ALTER TABLE public.profiles 
ADD COLUMN department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- Now add foreign key to departments referencing profiles
ALTER TABLE public.departments
ADD CONSTRAINT fk_departments_team_lead
FOREIGN KEY (team_lead_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add department_id to work_employees
ALTER TABLE public.work_employees 
ADD COLUMN department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- Trigger for updated_at on departments
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();