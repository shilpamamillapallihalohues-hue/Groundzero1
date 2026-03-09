-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('director', 'producer', 'department_head', 'artist', 'client');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'artist',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  genre TEXT,
  status TEXT NOT NULL DEFAULT 'pre_production',
  director_id UUID REFERENCES public.profiles(id),
  producer_id UUID REFERENCES public.profiles(id),
  thumbnail_url TEXT,
  estimated_budget NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scenes table
CREATE TABLE public.scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_number TEXT NOT NULL,
  slugline TEXT NOT NULL,
  location TEXT,
  time_of_day TEXT DEFAULT 'day',
  description TEXT,
  characters TEXT[] DEFAULT '{}',
  props TEXT[] DEFAULT '{}',
  costumes TEXT[] DEFAULT '{}',
  vfx_required BOOLEAN DEFAULT false,
  vfx_complexity TEXT,
  sound_cues TEXT[] DEFAULT '{}',
  camera_directions TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'not_started',
  estimated_duration INTEGER DEFAULT 0,
  assigned_departments TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES public.scenes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  department TEXT NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storyboards table
CREATE TABLE public.storyboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id UUID NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
  shot_number TEXT NOT NULL,
  image_url TEXT,
  prompt TEXT,
  shot_type TEXT,
  camera_angle TEXT,
  lighting TEXT,
  mood TEXT,
  action TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storyboards ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Projects policies (all authenticated users can view, directors/producers can modify)
CREATE POLICY "Authenticated users can view projects" ON public.projects
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create projects" ON public.projects
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Project members can update projects" ON public.projects
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Project members can delete projects" ON public.projects
  FOR DELETE TO authenticated USING (true);

-- Scenes policies
CREATE POLICY "Authenticated users can view scenes" ON public.scenes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create scenes" ON public.scenes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update scenes" ON public.scenes
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete scenes" ON public.scenes
  FOR DELETE TO authenticated USING (true);

-- Tasks policies
CREATE POLICY "Authenticated users can view tasks" ON public.tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create tasks" ON public.tasks
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update tasks" ON public.tasks
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete tasks" ON public.tasks
  FOR DELETE TO authenticated USING (true);

-- Storyboards policies
CREATE POLICY "Authenticated users can view storyboards" ON public.storyboards
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create storyboards" ON public.storyboards
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update storyboards" ON public.storyboards
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete storyboards" ON public.storyboards
  FOR DELETE TO authenticated USING (true);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'artist')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scenes_updated_at BEFORE UPDATE ON public.scenes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_storyboards_updated_at BEFORE UPDATE ON public.storyboards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();