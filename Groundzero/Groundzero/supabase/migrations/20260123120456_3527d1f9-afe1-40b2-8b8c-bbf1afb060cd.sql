-- Update the check constraint to allow more asset types
ALTER TABLE public.project_deliverables DROP CONSTRAINT IF EXISTS project_deliverables_asset_type_check;

ALTER TABLE public.project_deliverables ADD CONSTRAINT project_deliverables_asset_type_check 
CHECK (asset_type = ANY (ARRAY['model'::text, 'video'::text, 'image'::text, 'document'::text, '3d_model'::text, 'reference_image'::text, 'texture'::text]));