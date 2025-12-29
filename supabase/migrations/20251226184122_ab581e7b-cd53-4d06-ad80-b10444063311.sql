-- Create enum types for return management
CREATE TYPE public.return_status AS ENUM ('pending', 'approved', 'rejected', 'processing', 'shipped', 'received', 'completed', 'cancelled');
CREATE TYPE public.return_type AS ENUM ('refund', 'exchange', 'store_credit');
CREATE TYPE public.refund_method AS ENUM ('original_payment', 'store_credit', 'gift_card');
CREATE TYPE public.app_role AS ENUM ('admin', 'merchant', 'staff');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  store_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'merchant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create return policies table
CREATE TABLE public.return_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  return_window_days INTEGER NOT NULL DEFAULT 30,
  allow_exchanges BOOLEAN NOT NULL DEFAULT true,
  allow_refunds BOOLEAN NOT NULL DEFAULT true,
  allow_store_credit BOOLEAN NOT NULL DEFAULT true,
  store_credit_bonus_percent NUMERIC(5,2) DEFAULT 0,
  requires_receipt BOOLEAN NOT NULL DEFAULT false,
  requires_original_packaging BOOLEAN NOT NULL DEFAULT false,
  restocking_fee_percent NUMERIC(5,2) DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create return requests table
CREATE TABLE public.return_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  order_number TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  return_type return_type NOT NULL DEFAULT 'refund',
  refund_method refund_method DEFAULT 'original_payment',
  status return_status NOT NULL DEFAULT 'pending',
  policy_id UUID REFERENCES public.return_policies(id),
  reason TEXT NOT NULL,
  customer_notes TEXT,
  merchant_notes TEXT,
  original_amount NUMERIC(10,2) NOT NULL,
  refund_amount NUMERIC(10,2),
  store_credit_amount NUMERIC(10,2),
  tracking_number TEXT,
  carrier TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  shipped_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create return items table
CREATE TABLE public.return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_request_id UUID NOT NULL REFERENCES public.return_requests(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  product_image_url TEXT,
  variant_id TEXT,
  variant_name TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  exchange_product_id TEXT,
  exchange_variant_id TEXT,
  exchange_product_name TEXT,
  condition TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create return reasons table
CREATE TABLE public.return_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create automation rules table
CREATE TABLE public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  conditions JSONB DEFAULT '[]'::jsonb,
  actions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policies for return_policies
CREATE POLICY "Users can view their own policies"
ON public.return_policies FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own policies"
ON public.return_policies FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own policies"
ON public.return_policies FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own policies"
ON public.return_policies FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for return_requests
CREATE POLICY "Users can view their own return requests"
ON public.return_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own return requests"
ON public.return_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own return requests"
ON public.return_requests FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own return requests"
ON public.return_requests FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for return_items
CREATE POLICY "Users can view items of their return requests"
ON public.return_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.return_requests
    WHERE return_requests.id = return_items.return_request_id
    AND return_requests.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert items to their return requests"
ON public.return_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.return_requests
    WHERE return_requests.id = return_items.return_request_id
    AND return_requests.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update items of their return requests"
ON public.return_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.return_requests
    WHERE return_requests.id = return_items.return_request_id
    AND return_requests.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete items of their return requests"
ON public.return_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.return_requests
    WHERE return_requests.id = return_items.return_request_id
    AND return_requests.user_id = auth.uid()
  )
);

-- RLS Policies for return_reasons
CREATE POLICY "Users can view their own return reasons"
ON public.return_reasons FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own return reasons"
ON public.return_reasons FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own return reasons"
ON public.return_reasons FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own return reasons"
ON public.return_reasons FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for automation_rules
CREATE POLICY "Users can view their own automation rules"
ON public.automation_rules FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own automation rules"
ON public.automation_rules FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own automation rules"
ON public.automation_rules FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own automation rules"
ON public.automation_rules FOR DELETE
USING (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'merchant');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_return_policies_updated_at
  BEFORE UPDATE ON public.return_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_return_requests_updated_at
  BEFORE UPDATE ON public.return_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();