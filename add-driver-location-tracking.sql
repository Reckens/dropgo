-- Add real-time location tracking columns to drivers table
ALTER TABLE drivers
ADD COLUMN IF NOT EXISTS current_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS current_lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_sharing_location BOOLEAN DEFAULT false;

-- Create index for efficient location queries
CREATE INDEX IF NOT EXISTS idx_drivers_location 
ON drivers(current_lat, current_lng) 
WHERE is_sharing_location = true;

-- Update RLS policies to allow drivers to update their own location
CREATE POLICY "Drivers can update their own location"
ON drivers
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow customers to read driver location when they have an active ride
CREATE POLICY "Customers can read assigned driver location"
ON drivers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM ride_requests
    WHERE ride_requests.driver_id = drivers.id
    AND ride_requests.customer_id = auth.uid()
    AND ride_requests.status IN ('accepted', 'in_progress')
  )
);

-- Comment for documentation
COMMENT ON COLUMN drivers.current_lat IS 'Current latitude of driver (updated in real-time during active rides)';
COMMENT ON COLUMN drivers.current_lng IS 'Current longitude of driver (updated in real-time during active rides)';
COMMENT ON COLUMN drivers.last_location_update IS 'Timestamp of last location update';
COMMENT ON COLUMN drivers.is_sharing_location IS 'Whether driver is currently sharing location (active ride)';
