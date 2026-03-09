-- Add is_active column to profiles for enable/disable login
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Add status column for member status
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated'));