-- Add UPDATE policy for reference-images bucket (missing, causing upload issues)
CREATE POLICY "Authenticated users can update reference images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'reference-images' AND auth.uid() IS NOT NULL)
WITH CHECK (bucket_id = 'reference-images' AND auth.uid() IS NOT NULL);
