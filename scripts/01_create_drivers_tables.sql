-- Create drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  profile_image_url TEXT,
  is_online BOOLEAN DEFAULT FALSE,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  last_location_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on phone for faster lookups
CREATE INDEX IF NOT EXISTS idx_drivers_phone ON drivers(phone);
CREATE INDEX IF NOT EXISTS idx_drivers_is_online ON drivers(is_online);

-- Enable RLS (Row Level Security)
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Drivers can read all drivers" ON drivers
  FOR SELECT USING (true);

CREATE POLICY "Drivers can update their own profile" ON drivers
  FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Drivers can insert their own profile" ON drivers
  FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- Create storage bucket for driver profile images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('driver-profiles', 'driver-profiles', true)
ON CONFLICT DO NOTHING;

-- Create storage policy
CREATE POLICY "Public driver images" ON storage.objects
  FOR SELECT USING (bucket_id = 'driver-profiles');

CREATE POLICY "Drivers can upload their own images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'driver-profiles' 
    AND auth.role() = 'authenticated'
  );
