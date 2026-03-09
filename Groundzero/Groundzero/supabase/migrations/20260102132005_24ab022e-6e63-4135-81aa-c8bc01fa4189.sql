-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create a new policy that allows authenticated users to insert profiles
-- This is needed for the team invite functionality where we create placeholder profiles
CREATE POLICY "Authenticated users can insert profiles" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (true);