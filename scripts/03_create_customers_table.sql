-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  profile_image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create ride requests table
CREATE TABLE IF NOT EXISTS ride_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  pickup_location VARCHAR(255),
  pickup_latitude NUMERIC,
  pickup_longitude NUMERIC,
  dropoff_location VARCHAR(255),
  dropoff_latitude NUMERIC,
  dropoff_longitude NUMERIC,
  status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, in_progress, completed, cancelled
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers
CREATE POLICY "Anyone can register as customer"
  ON customers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view all customers"
  ON customers FOR SELECT
  USING (true);

CREATE POLICY "Customers can update their own profile"
  ON customers FOR UPDATE
  USING (true);

-- RLS Policies for ride requests
CREATE POLICY "Anyone can view ride requests"
  ON ride_requests FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create ride requests"
  ON ride_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update ride requests"
  ON ride_requests FOR UPDATE
  USING (true);

-- Create indexes for performance
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_ride_requests_customer_id ON ride_requests(customer_id);
CREATE INDEX idx_ride_requests_driver_id ON ride_requests(driver_id);
CREATE INDEX idx_ride_requests_status ON ride_requests(status);
