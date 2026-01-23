# Guía de Migración de Base de Datos - TuCancha

## 📋 Resumen

Esta guía te ayudará a migrar tu base de datos de Supabase a la nueva estructura optimizada.

## ⚠️ IMPORTANTE - Antes de Empezar

1. **Backup de Datos**: Si tienes datos importantes, haz un backup desde Supabase Dashboard
2. **Tiempo Estimado**: 10-15 minutos
3. **Downtime**: La aplicación no estará disponible durante la migración

## 🗂️ Archivos de Migración

Los scripts deben ejecutarse en este orden:

1. `01_cleanup_database.sql` - Limpia todas las tablas existentes
2. `02_create_schema.sql` - Crea la nueva estructura de tablas
3. `03_rls_policies.sql` - Configura las políticas de seguridad
4. `04_storage_setup.sql` - Configura los buckets de almacenamiento

## 📝 Pasos de Migración

### Paso 1: Limpiar Base de Datos Existente

1. Abre Supabase Dashboard
2. Ve a **SQL Editor**
3. Crea una nueva query
4. Copia y pega el contenido de `01_cleanup_database.sql`
5. Haz clic en **Run**
6. Verifica que no haya errores

**Verificación**: Ejecuta este query para confirmar que las tablas se eliminaron:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

### Paso 2: Crear Nueva Estructura

1. En SQL Editor, crea una nueva query
2. Copia y pega el contenido de `02_create_schema.sql`
3. Haz clic en **Run**
4. Verifica que no haya errores

**Verificación**: Deberías ver estas tablas creadas:
- profiles
- venues
- courts
- bookings
- disabled_slots
- subscriptions
- payments
- notifications
- platform_revenue (vista materializada)

### Paso 3: Configurar Políticas RLS

1. En SQL Editor, crea una nueva query
2. Copia y pega el contenido de `03_rls_policies.sql`
3. Haz clic en **Run**
4. Verifica que no haya errores

**Verificación**: Ejecuta este query para ver las políticas:
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

### Paso 4: Configurar Storage

#### 4.1 Limpiar Buckets Antiguos (Opcional)

1. Ve a **Storage** en Supabase Dashboard
2. Elimina los buckets antiguos si existen:
   - `court_images`
   - Cualquier otro bucket que no necesites

#### 4.2 Crear Nuevos Buckets

**Opción A: Usando SQL (Recomendado)**
1. En SQL Editor, crea una nueva query
2. Copia y pega el contenido de `04_storage_setup.sql`
3. Haz clic en **Run**

**Opción B: Usando la UI**
1. Ve a **Storage** → **New bucket**
2. Crea `venue-images`:
   - Name: `venue-images`
   - Public: ✅ Yes
   - File size limit: 5 MB
   - Allowed MIME types: `image/jpeg, image/png, image/webp`
3. Repite para `court-images`

**Verificación**: Deberías ver los buckets:
- venue-images
- court-images

### Paso 5: Crear Usuario Admin

Ejecuta este script para crear tu usuario admin:

```sql
-- Reemplaza con tu email y user_id de auth.users
INSERT INTO profiles (id, email, full_name, role)
VALUES (
    '3ed02745-98df-4eb8-ae55-0e764aadb72e
', -- Obtén esto de auth.users
    'jctec050@gmail.com',
    'Juan Piris',
    'ADMIN'
);
```

Para obtener tu `user_id`:
```sql
SELECT id, email FROM auth.users WHERE email = 'tu-email@ejemplo.com';
```

### Paso 6: Crear Suscripción FREE por Defecto (Opcional)

Si quieres que los nuevos owners tengan una suscripción FREE automática, puedes crear un trigger:

```sql
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'OWNER' THEN
        INSERT INTO subscriptions (
            owner_id,
            plan_type,
            status,
            start_date,
            price_per_month,
            max_venues,
            max_courts_per_venue
        ) VALUES (
            NEW.id,
            'FREE',
            'ACTIVE',
            CURRENT_DATE,
            0,
            1,
            5
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_subscription_on_owner_signup
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_default_subscription();
```

## ✅ Verificación Final

Ejecuta estos queries para verificar que todo está correcto:

```sql
-- 1. Verificar tablas
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- 2. Verificar políticas RLS
SELECT COUNT(*) as total_policies FROM pg_policies WHERE schemaname = 'public';

-- 3. Verificar storage buckets
SELECT id, name, public FROM storage.buckets WHERE id IN ('venue-images', 'court-images');

-- 4. Verificar tu usuario admin
SELECT id, email, role FROM profiles WHERE role = 'ADMIN';
```

## 🔄 Próximos Pasos

Después de completar la migración:

1. ✅ Actualizar tipos TypeScript en el código
2. ✅ Actualizar servicios de datos (`dataService.ts`)
3. ✅ Actualizar componentes para usar Supabase Storage
4. ✅ Probar la aplicación

## 🆘 Solución de Problemas

### Error: "permission denied for table"
- Verifica que las políticas RLS se crearon correctamente
- Asegúrate de estar autenticado con el usuario correcto

### Error: "relation already exists"
- Ejecuta el script de limpieza (`01_cleanup_database.sql`) nuevamente
- Verifica que no haya tablas residuales

### Error en Storage Policies
- Asegúrate de que los buckets existen antes de crear las políticas
- Verifica que el bucket_id coincida exactamente

### No puedo subir imágenes
- Verifica que las políticas de storage se crearon correctamente
- Asegúrate de que tu usuario tiene el rol correcto (OWNER)
- Verifica los límites de tamaño (5MB máximo)

## 📞 Soporte

Si encuentras algún problema durante la migración, revisa:
1. Los logs de error en Supabase Dashboard
2. La consola del navegador para errores de frontend
3. Los queries de verificación en esta guía
