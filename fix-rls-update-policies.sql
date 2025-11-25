-- Enable RLS on ride_requests if not already enabled
alter table ride_requests enable row level security;

-- Drop existing update policies to avoid conflicts/duplication
drop policy if exists "Customers can update their own requests" on ride_requests;
drop policy if exists "Drivers can update their assigned requests" on ride_requests;
drop policy if exists "Users can update their own ride requests" on ride_requests;

-- Policy: Customers can CANCEL their own requests
-- We allow them to update any column for simplicity, but logically they only change status
create policy "Customers can update their own requests"
on ride_requests for update
to authenticated
using (auth.uid() = customer_id);

-- Policy: Drivers can UPDATE requests they are assigned to
create policy "Drivers can update their assigned requests"
on ride_requests for update
to authenticated
using (auth.uid() = driver_id);

-- Verify policies
select * from pg_policies where tablename = 'ride_requests';
