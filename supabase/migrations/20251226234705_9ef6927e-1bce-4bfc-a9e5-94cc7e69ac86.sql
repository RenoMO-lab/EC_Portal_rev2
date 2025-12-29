-- Create a table for shipping fee settings
CREATE TABLE public.shipping_fee_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  return_shipping_fee numeric NOT NULL DEFAULT 0,
  new_product_shipping_fee numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.shipping_fee_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own shipping fee settings" 
ON public.shipping_fee_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shipping fee settings" 
ON public.shipping_fee_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shipping fee settings" 
ON public.shipping_fee_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shipping fee settings" 
ON public.shipping_fee_settings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_shipping_fee_settings_updated_at
BEFORE UPDATE ON public.shipping_fee_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();