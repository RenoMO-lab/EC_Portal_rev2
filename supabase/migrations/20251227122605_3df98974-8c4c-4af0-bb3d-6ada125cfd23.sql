-- Add return window start field to return_policies table
ALTER TABLE public.return_policies 
ADD COLUMN return_window_start text NOT NULL DEFAULT 'delivered';

-- Add comment to explain the column
COMMENT ON COLUMN public.return_policies.return_window_start IS 'When the return window starts counting: fulfilled or delivered';