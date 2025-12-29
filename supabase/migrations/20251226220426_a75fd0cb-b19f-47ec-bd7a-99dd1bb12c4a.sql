-- Create table for custom return type options
CREATE TABLE public.return_type_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  return_type TEXT NOT NULL DEFAULT 'refund',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.return_type_options ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own return type options" 
ON public.return_type_options FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own return type options" 
ON public.return_type_options FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own return type options" 
ON public.return_type_options FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own return type options" 
ON public.return_type_options FOR DELETE 
USING (auth.uid() = user_id);