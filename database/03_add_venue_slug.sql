-- ============================================
-- MIGRACIÓN: Agregar slug público a venues
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Agregar columna slug (nullable primero para no romper filas existentes)
ALTER TABLE venues 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Índice UNIQUE para búsquedas O(log n) y garantía de unicidad
CREATE UNIQUE INDEX IF NOT EXISTS idx_venues_slug ON venues(slug);

-- 3. Generar slugs para venues existentes (ejecutar UNA sola vez)
-- El slug es: nombre-slugificado + primeros 6 chars del UUID para garantizar unicidad
UPDATE venues 
SET slug = LOWER(
    REGEXP_REPLACE(
        REGEXP_REPLACE(
            REGEXP_REPLACE(name, '[áàäâ]', 'a', 'gi'),
            '[éèëê]', 'e', 'gi'
        ),
        '[^a-z0-9\s]', '', 'g'
    )
) 
WHERE slug IS NULL;

-- Reemplazar espacios por guiones en un segundo paso
UPDATE venues
SET slug = REGEXP_REPLACE(slug, '\s+', '-', 'g') || '-' || SUBSTRING(id::text, 1, 6)
WHERE slug IS NOT NULL AND slug NOT LIKE '%-______';

-- 4. Comentario en la columna
COMMENT ON COLUMN venues.slug IS 'Identificador único URL-safe para la página pública. Ejemplo: sport-center-asuncion-a1b2c3';

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT id, name, slug FROM venues ORDER BY name;
