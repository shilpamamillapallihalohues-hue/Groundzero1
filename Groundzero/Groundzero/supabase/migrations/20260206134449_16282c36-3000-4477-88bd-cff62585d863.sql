-- Allow scene_references to be uploaded without a scene (optional tagging)
ALTER TABLE public.scene_references ALTER COLUMN scene_id DROP NOT NULL;