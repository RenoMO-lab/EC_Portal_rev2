-- Create storage bucket for return images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('return-images', 'return-images', true);

-- Allow public read access to return images
CREATE POLICY "Return images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'return-images');

-- Allow anyone to upload return images (for customer portal)
CREATE POLICY "Anyone can upload return images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'return-images');

-- Add image_urls column to return_requests table
ALTER TABLE public.return_requests 
ADD COLUMN IF NOT EXISTS defect_image_urls text[] DEFAULT '{}';

-- Add other_reason_description column for "Other" reason
ALTER TABLE public.return_requests 
ADD COLUMN IF NOT EXISTS other_reason_description text;