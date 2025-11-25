-- ========================================
-- Migración: Agregar estados de viaje y timestamps
-- ========================================
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar columnas de timestamp para tracking del viaje
ALTER TABLE ride_requests 
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_by TEXT; -- 'customer' or 'driver'

-- 2. Actualizar la columna status si no tiene los valores correctos
-- Los estados posibles son: 'pending', 'accepted', 'in_progress', 'completed', 'cancelled'

-- 3. Crear índice para búsquedas por estado
CREATE INDEX IF NOT EXISTS idx_ride_requests_status ON ride_requests(status);

-- 4. Verificar la estructura
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ride_requests'
ORDER BY ordinal_position;
