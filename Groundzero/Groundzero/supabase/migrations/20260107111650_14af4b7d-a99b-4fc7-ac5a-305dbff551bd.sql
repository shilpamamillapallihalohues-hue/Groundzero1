-- Create storage bucket for library assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('library-assets', 'library-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to library-assets bucket
CREATE POLICY "Authenticated users can upload library assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'library-assets' AND auth.role() = 'authenticated');

-- Allow public read access to library assets
CREATE POLICY "Public read access to library assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'library-assets');