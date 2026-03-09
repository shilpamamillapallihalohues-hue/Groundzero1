-- Add phase column to departments table for production hierarchy
ALTER TABLE public.departments 
ADD COLUMN IF NOT EXISTS phase text DEFAULT 'production';

-- Add department_id to profiles if not exists (for employee assignment)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'profiles' 
                 AND column_name = 'department_id') THEN
    ALTER TABLE public.profiles ADD COLUMN department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_departments_phase ON public.departments(phase);
CREATE INDEX IF NOT EXISTS idx_profiles_department_id ON public.profiles(department_id);