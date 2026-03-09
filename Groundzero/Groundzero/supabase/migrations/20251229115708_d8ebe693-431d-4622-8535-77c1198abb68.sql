-- Create storage bucket for reference images
INSERT INTO storage.buckets (id, name, public)
VALUES ('reference-images', 'reference-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for reference images
CREATE POLICY "Anyone can view reference images"
ON storage.objects FOR SELECT
USING (bucket_id = 'reference-images');

CREATE POLICY "Authenticated users can upload reference images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'reference-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their reference images"
ON storage.objects FOR DELETE
USING (bucket_id = 'reference-images' AND auth.uid() IS NOT NULL);