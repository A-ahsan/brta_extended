-- Vehicle Table for BRTA System
-- Normalized, links to user and license

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_name TEXT NOT NULL,
  model TEXT NOT NULL,
  engine_number TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  license_id UUID REFERENCES licenses(id) ON DELETE CASCADE,
  vehicle_type VARCHAR(10) CHECK (vehicle_type IN ('Bike', 'Car')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_vehicles_owner_id ON vehicles(owner_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_license_id ON vehicles(license_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_engine_number ON vehicles(engine_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(vehicle_type);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_vehicles_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_vehicles_updated_at_column();
