-- Migration: Add tables and columns for DropGo ride-sharing app
-- Run this in your Supabase SQL Editor

-- 1. Ensure customers table exists with all required columns
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  profile_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Ensure drivers table exists with all required columns
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  profile_image_url TEXT,
  is_online BOOLEAN DEFAULT FALSE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  last_location_update TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create ride_requests table
CREATE TABLE IF NOT EXISTS ride_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  pickup_location TEXT NOT NULL,
  pickup_latitude DOUBLE PRECISION NOT NULL,
  pickup_longitude DOUBLE PRECISION NOT NULL,
  dropoff_location TEXT,
  dropoff_latitude DOUBLE PRECISION,
  dropoff_longitude DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create driver_tariff_config table for custom tariff settings
CREATE TABLE IF NOT EXISTS driver_tariff_config (
  driver_id UUID PRIMARY KEY REFERENCES drivers(id) ON DELETE CASCADE,
  base_fare DECIMAL(10, 2) DEFAULT 7.00,
  day_per_km DECIMAL(10, 2) DEFAULT 2.50,
  night_per_km DECIMAL(10, 2) DEFAULT 3.50,
  night_start INTEGER DEFAULT 21,
  night_end INTEGER DEFAULT 6,
  extra_per_passenger DECIMAL(10, 2) DEFAULT 2.00,
  route_factor DECIMAL(10, 2) DEFAULT 1.20,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_drivers_online ON drivers(is_online) WHERE is_online = TRUE;
CREATE INDEX IF NOT EXISTS idx_drivers_location ON drivers(latitude, longitude) WHERE is_online = TRUE;
CREATE INDEX IF NOT EXISTS idx_ride_requests_driver_status ON ride_requests(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_ride_requests_customer ON ride_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_created_at ON ride_requests(created_at DESC);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_tariff_config ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies (allow all for now - you can restrict later)
-- Customers policies
DROP POLICY IF EXISTS "Allow public read access to customers" ON customers;
CREATE POLICY "Allow public read access to customers" ON customers FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Allow public insert to customers" ON customers;
CREATE POLICY "Allow public insert to customers" ON customers FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Allow public update to customers" ON customers;
CREATE POLICY "Allow public update to customers" ON customers FOR UPDATE USING (TRUE);

-- Drivers policies
DROP POLICY IF EXISTS "Allow public read access to drivers" ON drivers;
CREATE POLICY "Allow public read access to drivers" ON drivers FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Allow public insert to drivers" ON drivers;
CREATE POLICY "Allow public insert to drivers" ON drivers FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Allow public update to drivers" ON drivers;
CREATE POLICY "Allow public update to drivers" ON drivers FOR UPDATE USING (TRUE);

-- Ride requests policies
DROP POLICY IF EXISTS "Allow public read access to ride_requests" ON ride_requests;
CREATE POLICY "Allow public read access to ride_requests" ON ride_requests FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Allow public insert to ride_requests" ON ride_requests;
CREATE POLICY "Allow public insert to ride_requests" ON ride_requests FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Allow public update to ride_requests" ON ride_requests;
CREATE POLICY "Allow public update to ride_requests" ON ride_requests FOR UPDATE USING (TRUE);

-- Driver tariff config policies
DROP POLICY IF EXISTS "Allow public read access to driver_tariff_config" ON driver_tariff_config;
CREATE POLICY "Allow public read access to driver_tariff_config" ON driver_tariff_config FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Allow public insert to driver_tariff_config" ON driver_tariff_config;
CREATE POLICY "Allow public insert to driver_tariff_config" ON driver_tariff_config FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Allow public update to driver_tariff_config" ON driver_tariff_config;
CREATE POLICY "Allow public update to driver_tariff_config" ON driver_tariff_config FOR UPDATE USING (TRUE);

-- 8. Enable Realtime for ride_requests table
ALTER PUBLICATION supabase_realtime ADD TABLE ride_requests;

-- 9. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Add triggers to update updated_at automatically
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ride_requests_updated_at ON ride_requests;
CREATE TRIGGER update_ride_requests_updated_at BEFORE UPDATE ON ride_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_driver_tariff_config_updated_at ON driver_tariff_config;
CREATE TRIGGER update_driver_tariff_config_updated_at BEFORE UPDATE ON driver_tariff_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Create global_config table for centralized system configuration
CREATE TABLE IF NOT EXISTS global_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_global_config_key ON global_config(config_key);

-- Insert default tariff configuration
INSERT INTO global_config (config_key, config_value, updated_by) 
VALUES (
  'tariffs',
  '{
    "baseFare": 7,
    "dayPerKm": 2.5,
    "nightPerKm": 3.5,
    "nightStart": 21,
    "nightEnd": 6,
    "extraPerPassenger": 2,
    "routeFactor": 1.2
  }'::jsonb,
  'system'
) ON CONFLICT (config_key) DO NOTHING;

-- 12. Create admins table for admin users
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default admin user (username: admin, password: admin123)
-- IMPORTANT: Change this password in production!
INSERT INTO admins (username, password_hash) 
VALUES ('admin', 'admin123')
ON CONFLICT (username) DO NOTHING;

-- 13. Enable RLS for new tables
ALTER TABLE global_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Global config policies (read-only for public, admin can update)
DROP POLICY IF EXISTS "Allow public read access to global_config" ON global_config;
CREATE POLICY "Allow public read access to global_config" ON global_config FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Allow admin update to global_config" ON global_config;
CREATE POLICY "Allow admin update to global_config" ON global_config FOR UPDATE USING (TRUE);

DROP POLICY IF EXISTS "Allow admin insert to global_config" ON global_config;
CREATE POLICY "Allow admin insert to global_config" ON global_config FOR INSERT WITH CHECK (TRUE);

-- Admins policies (read-only for authentication)
DROP POLICY IF EXISTS "Allow public read access to admins" ON admins;
CREATE POLICY "Allow public read access to admins" ON admins FOR SELECT USING (TRUE);

-- 14. Add trigger for global_config updated_at
DROP TRIGGER IF EXISTS update_global_config_updated_at ON global_config;
CREATE TRIGGER update_global_config_updated_at BEFORE UPDATE ON global_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
