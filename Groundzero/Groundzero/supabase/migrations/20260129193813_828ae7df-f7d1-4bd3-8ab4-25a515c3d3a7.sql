-- Add missing storyboard_supervisor role to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'storyboard_supervisor';

-- Also add production_lead which may be needed
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'production_lead';