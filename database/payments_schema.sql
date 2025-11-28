-- Payments table for SSLCommerz integration
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES license_applications(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'BDT',
  tran_id VARCHAR(64) UNIQUE NOT NULL,
  status VARCHAR(20) CHECK (status IN ('initiated', 'success', 'failed', 'cancelled')) NOT NULL,
  payment_method VARCHAR(30),
  sslcommerz_val_id VARCHAR(100),
  sslcommerz_tran_date TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_application_id ON payments(application_id);
