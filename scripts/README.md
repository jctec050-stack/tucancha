# 📦 Scripts de Backup - TuCancha

## Backup Manual de Base de Datos

Este script exporta todas las tablas críticas de Supabase a archivos JSON locales.

### 🚀 Uso Rápido

**Opción 1: Node.js (Recomendado)**
```bash
npm run backup
```

**Opción 2: PowerShell (Windows)**
```powershell
.\scripts\backup-database.ps1
```

### 📋 Qué se Exporta

El script crea backups de estas tablas:
- ✅ `profiles` - Usuarios
- ✅ `venues` - Complejos
- ✅ `courts` - Canchas
- ✅ `bookings` - Reservas
- ✅ `disabled_slots` - Bloqueos de horarios
- ✅ `subscriptions` - Suscripciones
- ✅ `payments` - Pagos
- ✅ `notifications` - Notificaciones

### 📁 Estructura de Salida

```
backups/
└── 2026-02-06_22-30-00/
    ├── profiles.json
    ├── venues.json
    ├── courts.json
    ├── bookings.json
    ├── disabled_slots.json
    ├── subscriptions.json
    ├── payments.json
    ├── notifications.json
    └── _BACKUP_SUMMARY.json  ← Resumen del backup
```

### 🔄 Frecuencia Recomendada

- **Desarrollo**: Antes de cambios grandes
- **Producción**: Semanal (Domingos)
- **Crítico**: Antes de migraciones de base de datos

### 🛡️ Restauración

Si necesitas restaurar un backup:

1. **Abre Supabase SQL Editor**
   ```
   https://app.supabase.com/project/aynoabizwajdhrxjnhgq/sql
   ```

2. **Limpia la tabla** (ejemplo con `venues`)
   ```sql
   DELETE FROM venues WHERE true;
   ```

3. **Copia el contenido del JSON**
   - Abre `backups/2026-02-06_22-30-00/venues.json`
   - Copia todo el contenido

4. **Importa usando SQL** (o usar Supabase Table Editor)
   ```sql
   -- Opción A: Via SQL
   INSERT INTO venues (id, owner_id, name, ...)
   SELECT * FROM json_populate_recordset(null::venues, '[... pegar JSON ...]');
   
   -- Opción B: Usar Table Editor → Import → Paste JSON
   ```

### ⚙️ Configuración

El script usa las variables de `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**No requiere configuración adicional** si tu `.env.local` está correctamente configurado.

### 📊 Ejemplo de Salida

```
🔄 Iniciando backup de base de datos...

📦 Exportando tabla: profiles...
   ✅ 12 registros exportados → profiles.json
📦 Exportando tabla: venues...
   ✅ 5 registros exportados → venues.json
📦 Exportando tabla: courts...
   ✅ 15 registros exportados → courts.json
📦 Exportando tabla: bookings...
   ✅ 243 registros exportados → bookings.json
...

==================================================
✅ BACKUP COMPLETADO
==================================================
📁 Carpeta: backups/2026-02-06_22-30-00
📊 Tablas exportadas: 8/8
📝 Total de registros: 298
==================================================
```

### 🤖 Automatización (Opcional)

Para automatizar backups semanales con GitHub Actions:

**Crea `.github/workflows/weekly-backup.yml`**:
```yaml
name: Weekly Database Backup

on:
  schedule:
    - cron: '0 3 * * 0'  # Domingos 3am UTC
  workflow_dispatch:  # Manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run backup
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        run: npm run backup
      
      - name: Upload backup artifact
        uses: actions/upload-artifact@v3
        with:
          name: database-backup-${{ github.run_number }}
          path: backups/
          retention-days: 30
```

### ⚠️ Limitaciones

- Solo exporta datos (no esquema de tablas)
- No incluye contraseñas hasheadas (solo metadata de auth)
- Archivos grandes (>10MB) pueden tardar
- Requiere conexión a internet

### 🆘 Troubleshooting

**Error: Variables de entorno no encontradas**
```bash
# Verifica que .env.local existe
ls .env.local

# Verifica contenido
cat .env.local | grep SUPABASE
```

**Error: fetch no está definido (Node.js <18)**
```bash
# Actualiza Node.js a v18+
node --version  # debe ser ≥18

# O usa node-fetch
npm install node-fetch@2
```

**Error: Permission denied (PowerShell)**
```powershell
# Habilitar ejecución de scripts
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

💡 **Tip**: Mantén al menos los últimos 3 backups. Elimina backups viejos manualmente cuando ocupen mucho espacio.
