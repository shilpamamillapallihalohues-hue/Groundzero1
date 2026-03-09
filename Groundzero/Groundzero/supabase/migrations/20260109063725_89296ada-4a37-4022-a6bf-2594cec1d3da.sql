-- Add missing pre-production and production roles to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'script_writer';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'script_supervisor';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'concept_artist';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'art_director';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'storyboard_artist';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'editor';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'previz_artist';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'technical_director';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'modeling_artist';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'texturing_artist';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'rigging_artist';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'animation_artist';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'lighting_artist';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'vfx_artist';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'render_artist';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'compositor';