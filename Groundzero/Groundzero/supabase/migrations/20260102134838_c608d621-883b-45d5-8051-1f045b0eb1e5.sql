-- Create a team_invitations table for pending team members
CREATE TABLE public.team_invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name text NOT NULL,
    email text NOT NULL UNIQUE,
    role public.user_role NOT NULL DEFAULT 'artist',
    invited_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired'))
);

-- Enable RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view invitations"
ON public.team_invitations FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create invitations"
ON public.team_invitations FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update invitations"
ON public.team_invitations FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Admins can delete invitations"
ON public.team_invitations FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));