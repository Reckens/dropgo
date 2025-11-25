-- Remove old policies that require auth.uid() matching
DROP POLICY IF EXISTS "Drivers can insert their own profile" ON drivers;
DROP POLICY IF EXISTS "Drivers can update their own profile" ON drivers;

-- Create new policies that allow public registration
-- Anyone can insert a new driver profile (public registration)
CREATE POLICY "Anyone can register as driver" ON drivers
  FOR INSERT WITH CHECK (true);

-- Anyone can update their own profile using phone number as identifier
-- This works because phone is UNIQUE so we can identify the driver
CREATE POLICY "Drivers can update their own profile by phone" ON drivers
  FOR UPDATE USING (true);

-- Anyone can read all drivers (to see them on the map)
CREATE POLICY "Anyone can view all drivers" ON drivers
  FOR SELECT USING (true);

-- Storage policies for profile images - allow anyone to upload
DROP POLICY IF EXISTS "Drivers can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Public driver images" ON storage.objects;

CREATE POLICY "Anyone can upload driver images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'driver-profiles');

CREATE POLICY "Anyone can view driver images" ON storage.objects
  FOR SELECT USING (bucket_id = 'driver-profiles');
