-- COMPREHENSIVE RLS FIX FOR RIDE REQUESTS
-- Run this in the Supabase SQL Editor

-- 1. Enable RLS
alter table ride_requests enable row level security;

-- 2. Drop ALL existing policies to ensure a clean slate
drop policy if exists "Customers can create ride requests" on ride_requests;
drop policy if exists "Customers can view their own requests" on ride_requests;
drop policy if exists "Customers can update their own requests" on ride_requests;
drop policy if exists "Drivers can view assigned requests" on ride_requests;
drop policy if exists "Drivers can update their assigned requests" on ride_requests;
drop policy if exists "Drivers can view pending requests" on ride_requests;
drop policy if exists "Users can update their own ride requests" on ride_requests;
drop policy if exists "Users can delete their own ride requests" on ride_requests;

-- 3. Create SELECT policies (Viewing)
-- Customers can see their own rides
create policy "Customers can view their own requests"
on ride_requests for select
to authenticated
using (auth.uid() = customer_id);

-- Drivers can see rides they are assigned to OR pending rides (to accept them)
create policy "Drivers can view requests"
on ride_requests for select
to authenticated
using (
  auth.uid() = driver_id 
  OR 
  status = 'pending'
);

-- 4. Create INSERT policies (Creating)
-- Customers can create rides
create policy "Customers can create ride requests"
on ride_requests for insert
to authenticated
with check (auth.uid() = customer_id);

-- 5. Create UPDATE policies (Modifying)
-- Customers can CANCEL their own rides (update status)
create policy "Customers can update their own requests"
on ride_requests for update
to authenticated
using (auth.uid() = customer_id);

-- Drivers can UPDATE rides they are assigned to (accept, start, complete)
-- We also allow them to 'claim' a pending ride by setting driver_id
create policy "Drivers can update requests"
on ride_requests for update
to authenticated
using (
  auth.uid() = driver_id 
  OR 
  (status = 'pending' AND driver_id IS NULL)
);

-- 6. Create DELETE policies (Deleting)
-- Allow users to delete their own requests if needed (mostly for cleanup)
create policy "Users can delete their own requests"
on ride_requests for delete
to authenticated
using (auth.uid() = customer_id OR auth.uid() = driver_id);

-- 7. Verify
select * from pg_policies where tablename = 'ride_requests';
