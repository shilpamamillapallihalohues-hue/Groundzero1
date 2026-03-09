-- Create storage bucket for script files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'script-files',
  'script-files',
  true,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for script-files bucket
CREATE POLICY "Authenticated users can upload scripts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'script-files');

CREATE POLICY "Authenticated users can view scripts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'script-files');

CREATE POLICY "Users can update their own script uploads"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'script-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own script uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'script-files' AND auth.uid()::text = (storage.foldername(name))[1]);