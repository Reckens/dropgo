-- ========================================
-- Migración: Agregar request_group_id para solicitudes grupales
-- ========================================
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar columna request_group_id para agrupar solicitudes del mismo viaje
ALTER TABLE ride_requests 
ADD COLUMN IF NOT EXISTS request_group_id UUID;

-- 2. Crear índice para búsquedas por grupo
CREATE INDEX IF NOT EXISTS idx_ride_requests_group ON ride_requests(request_group_id);

-- 3. Verificar la estructura
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ride_requests'
  AND column_name IN ('request_group_id', 'accepted_at', 'cancelled_at', 'cancelled_by')
ORDER BY ordinal_position;
