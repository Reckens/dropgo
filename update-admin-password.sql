-- ========================================
-- Script para actualizar contraseña de admin con bcrypt
-- ========================================
-- IMPORTANTE: Ejecutar este script en Supabase SQL Editor
-- antes de usar el nuevo sistema de login con bcrypt

-- Actualizar contraseña del admin
-- Contraseña: admin123
-- Hash bcrypt generado con salt rounds = 10

UPDATE admins 
SET password_hash = '$2b$10$.iDZUzr2IRuT/Sb/IC3MputPWsnA81u7.MKk8AAu8NNlyQWY./fVh.'
WHERE username = 'admin';

-- Verificar que se actualizó correctamente
SELECT username, password_hash, created_at 
FROM admins 
WHERE username = 'admin';

-- NOTA: Después de ejecutar este script, el login de admin
-- usará bcrypt para verificar la contraseña de forma segura
