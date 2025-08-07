CREATE TABLE job_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- General Information
  case_number TEXT NOT NULL,
  order_date DATE NOT NULL,
  
  -- Customer Details
  customer_name TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  customer_email TEXT,
  
  -- Appliance Details
  sku TEXT NOT NULL,
  coverage TEXT[] CHECK (coverage <@ ARRAY['EXP', 'WTY']),
  
  -- Complaint
  complaint_details TEXT,
  
  -- Dispatch
  dispatch_date DATE,
  dispatch_time TIME,
  
  -- Findings
  tested_before BOOLEAN DEFAULT FALSE,
  tested_after BOOLEAN DEFAULT FALSE,
  troubles_found INTEGER DEFAULT 0,
  other_notes TEXT,
  
  -- Media
  media_urls TEXT[],
  
  -- Signature
  signature_url TEXT,
  
  -- Terms acceptance
  terms_accepted BOOLEAN DEFAULT FALSE,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'synced')),
  
  -- Technician reference
  technician_id UUID REFERENCES auth.users(id)
);

-- Create index for sync operations
CREATE INDEX idx_job_orders_status ON job_orders(status);