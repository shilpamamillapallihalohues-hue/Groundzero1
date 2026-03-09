-- Add new roles to user_role enum (these must be committed first)
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'super_user';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'production_manager';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'hod';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'vendor';