-- Create ride_messages table for chat between driver and customer
CREATE TABLE IF NOT EXISTS ride_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_request_id UUID REFERENCES ride_requests(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'driver')),
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_predefined BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_ride_messages_ride 
ON ride_messages(ride_request_id, created_at DESC);

-- RLS Policies
ALTER TABLE ride_messages ENABLE ROW LEVEL SECURITY;

-- Allow customers to read messages from their rides
CREATE POLICY "Customers can read their ride messages"
ON ride_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM ride_requests
    WHERE ride_requests.id = ride_messages.ride_request_id
    AND ride_requests.customer_id = auth.uid()
  )
);

-- Allow drivers to read messages from their rides
CREATE POLICY "Drivers can read their ride messages"
ON ride_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM ride_requests
    WHERE ride_requests.id = ride_messages.ride_request_id
    AND ride_requests.driver_id = auth.uid()
  )
);

-- Allow customers to send messages in their rides
CREATE POLICY "Customers can send messages in their rides"
ON ride_messages
FOR INSERT
WITH CHECK (
  sender_type = 'customer' AND
  EXISTS (
    SELECT 1 FROM ride_requests
    WHERE ride_requests.id = ride_request_id
    AND ride_requests.customer_id = auth.uid()
    AND ride_requests.status IN ('accepted', 'in_progress')
  )
);

-- Allow drivers to send messages in their rides
CREATE POLICY "Drivers can send messages in their rides"
ON ride_messages
FOR INSERT
WITH CHECK (
  sender_type = 'driver' AND
  EXISTS (
    SELECT 1 FROM ride_requests
    WHERE ride_requests.id = ride_request_id
    AND ride_requests.driver_id = auth.uid()
    AND ride_requests.status IN ('accepted', 'in_progress')
  )
);

-- Allow users to mark their own messages as read
CREATE POLICY "Users can mark messages as read"
ON ride_messages
FOR UPDATE
USING (
  (sender_type = 'customer' AND EXISTS (
    SELECT 1 FROM ride_requests
    WHERE ride_requests.id = ride_request_id
    AND ride_requests.driver_id = auth.uid()
  )) OR
  (sender_type = 'driver' AND EXISTS (
    SELECT 1 FROM ride_requests
    WHERE ride_requests.id = ride_request_id
    AND ride_requests.customer_id = auth.uid()
  ))
);

-- Comments
COMMENT ON TABLE ride_messages IS 'Chat messages between driver and customer during rides';
COMMENT ON COLUMN ride_messages.sender_type IS 'Type of sender: customer or driver';
COMMENT ON COLUMN ride_messages.is_predefined IS 'Whether message is from predefined quick replies';
COMMENT ON COLUMN ride_messages.read_at IS 'Timestamp when message was read by recipient';
