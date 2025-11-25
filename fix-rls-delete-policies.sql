-- ========================================
-- Fix RLS Policies para permitir DELETE
-- ========================================
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar política DELETE para customers
DROP POLICY IF EXISTS "Allow public delete to customers" ON customers;
CREATE POLICY "Allow public delete to customers" ON customers FOR DELETE USING (TRUE);

-- 2. Agregar política DELETE para drivers
DROP POLICY IF EXISTS "Allow public delete to drivers" ON drivers;
CREATE POLICY "Allow public delete to drivers" ON drivers FOR DELETE USING (TRUE);

-- 3. Agregar política DELETE para ride_requests
DROP POLICY IF EXISTS "Allow public delete to ride_requests" ON ride_requests;
CREATE POLICY "Allow public delete to ride_requests" ON ride_requests FOR DELETE USING (TRUE);

-- 4. Verificar políticas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('customers', 'drivers', 'ride_requests')
ORDER BY tablename, policyname;
