-- Add asset_tags column to scene_references for tagging references to characters, props, assets
ALTER TABLE public.scene_references 
ADD COLUMN IF NOT EXISTS asset_tags text[] DEFAULT '{}';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_scene_references_asset_tags ON public.scene_references USING GIN(asset_tags);