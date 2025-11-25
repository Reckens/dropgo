-- ========================================
-- Migración: Sistema de Calificaciones
-- ========================================
-- Ejecutar en Supabase SQL Editor

-- 1. Crear tabla de calificaciones
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_request_id UUID REFERENCES ride_requests(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  rating_from TEXT NOT NULL CHECK (rating_from IN ('customer', 'driver')),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_ratings_ride ON ratings(ride_request_id);
CREATE INDEX IF NOT EXISTS idx_ratings_customer ON ratings(customer_id);
CREATE INDEX IF NOT EXISTS idx_ratings_driver ON ratings(driver_id);

-- 3. Agregar columnas de rating promedio a customers y drivers
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;

ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;

-- 4. Función para actualizar rating promedio del conductor
CREATE OR REPLACE FUNCTION update_driver_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rating_from = 'customer' THEN
    UPDATE drivers
    SET 
      total_ratings = (SELECT COUNT(*) FROM ratings WHERE driver_id = NEW.driver_id AND rating_from = 'customer'),
      average_rating = (SELECT AVG(rating)::DECIMAL(3,2) FROM ratings WHERE driver_id = NEW.driver_id AND rating_from = 'customer')
    WHERE id = NEW.driver_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Función para actualizar rating promedio del cliente
CREATE OR REPLACE FUNCTION update_customer_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rating_from = 'driver' THEN
    UPDATE customers
    SET 
      total_ratings = (SELECT COUNT(*) FROM ratings WHERE customer_id = NEW.customer_id AND rating_from = 'driver'),
      average_rating = (SELECT AVG(rating)::DECIMAL(3,2) FROM ratings WHERE customer_id = NEW.customer_id AND rating_from = 'driver')
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Crear triggers
DROP TRIGGER IF EXISTS trigger_update_driver_rating ON ratings;
CREATE TRIGGER trigger_update_driver_rating
  AFTER INSERT ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_rating();

DROP TRIGGER IF EXISTS trigger_update_customer_rating ON ratings;
CREATE TRIGGER trigger_update_customer_rating
  AFTER INSERT ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_rating();

-- 7. Habilitar RLS
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- 8. Políticas RLS
DROP POLICY IF EXISTS "Allow public read access to ratings" ON ratings;
CREATE POLICY "Allow public read access to ratings" ON ratings FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Allow public insert to ratings" ON ratings;
CREATE POLICY "Allow public insert to ratings" ON ratings FOR INSERT WITH CHECK (TRUE);

-- 9. Verificar estructura
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ratings'
ORDER BY ordinal_position;
