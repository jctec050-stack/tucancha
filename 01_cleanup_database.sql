-- ============================================
-- PASO 1: LIMPIEZA COMPLETA DE LA BASE DE DATOS
-- ============================================
-- ADVERTENCIA: Este script eliminará TODAS las tablas, vistas, funciones y datos existentes.
-- Asegúrate de hacer un backup si necesitas los datos actuales.

-- Desactivar triggers temporalmente
SET session_replication_role = 'replica';

-- Eliminar vistas materializadas si existen
DROP MATERIALIZED VIEW IF EXISTS platform_revenue CASCADE;

-- Eliminar tablas en orden inverso de dependencias
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS disabled_slots CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS courts CASCADE;
DROP TABLE IF EXISTS venues CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Eliminar funciones y triggers
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Eliminar políticas RLS (se eliminan automáticamente con las tablas, pero por si acaso)
-- Las políticas se recrearán en el siguiente script

-- Reactivar triggers
SET session_replication_role = 'origin';

-- Limpiar Storage Buckets (esto se debe hacer desde la UI de Supabase o con el cliente)
-- 1. Ir a Storage en Supabase Dashboard
-- 2. Eliminar buckets: 'venue-images', 'court-images', 'court_images' (si existen)

COMMENT ON SCHEMA public IS 'Base de datos limpia - Lista para nueva estructura';

-- Verificar que todo se eliminó correctamente
SELECT 
    schemaname,
    tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Si este query no devuelve resultados (excepto posiblemente algunas tablas del sistema), 
-- la limpieza fue exitosa.
