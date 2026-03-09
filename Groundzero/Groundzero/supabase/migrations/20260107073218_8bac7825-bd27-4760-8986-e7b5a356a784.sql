-- Create a helper function to check production roles
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Create function to check if user is super_user
CREATE OR REPLACE FUNCTION public.is_super_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = _user_id AND role = 'super_user'
  ) OR public.is_admin(_user_id)
$$;

-- Create function to check if user can approve (director, producer, hod, super_user)
CREATE OR REPLACE FUNCTION public.can_approve(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = _user_id 
    AND role IN ('super_user', 'director', 'producer', 'hod', 'department_head')
  ) OR public.is_admin(_user_id)
$$;