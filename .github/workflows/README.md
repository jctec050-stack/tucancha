# 🤖 Configuración de Backups Automáticos con GitHub Actions

## ✅ Archivo Creado

📄 `.github/workflows/weekly-backup.yml`

Este workflow se ejecuta **automáticamente cada domingo a las 3am UTC** y crea backups de tu base de datos.

---

## 🔧 Configuración Inicial (5 minutos)

### Paso 1: Configurar Secrets en GitHub

Los secrets son variables privadas que GitHub Actions usa de forma segura.

1. **Ve a tu repositorio en GitHub**
   ```
   https://github.com/TU_USUARIO/tucancha
   ```

2. **Navega a Settings → Secrets and Variables → Actions**
   ```
   Repositorio → Settings → Secrets and variables → Actions
   ```

3. **Agrega estos 2 secrets**:

   **Secret 1: `NEXT_PUBLIC_SUPABASE_URL`**
   ```
   Name: NEXT_PUBLIC_SUPABASE_URL
   Value: https://aynoabizwajdhrxjnhgq.supabase.co
   ```
   Click en "Add secret"

   **Secret 2: `NEXT_PUBLIC_SUPABASE_ANON_KEY`**
   ```
   Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS...
   ```
   (Copia el valor completo de tu `.env.local`)

### Paso 2: Verificar Permisos del Workflow

1. **Settings → Actions → General**

2. **Workflow permissions**
   - Seleccionar: ✅ "Read and write permissions"
   - Habilitar: ✅ "Allow GitHub Actions to create and approve pull requests"

3. **Save**

---

## 🚀 Uso

### Ejecución Automática

El workflow corre **automáticamente cada domingo a las 3am UTC** (12am hora Paraguay).

No necesitas hacer nada, solo esperar.

### Ejecución Manual

Puedes ejecutarlo manualmente cuando quieras:

1. **Ve a Actions tab en GitHub**
   ```
   https://github.com/TU_USUARIO/tucancha/actions
   ```

2. **Selecciona "Weekly Database Backup"** en la lista de workflows

3. **Click en "Run workflow"**
   - Branch: main (o el que uses)
   - Click "Run workflow" verde

4. **Espera 1-2 minutos** y el backup estará listo

---

## 📦 Dónde Encontrar los Backups

### Opción 1: Artifacts (30 días de retención)

1. **Actions → Selecciona el workflow ejecutado**
2. **Scroll down a "Artifacts"**
3. **Descarga**: `database-backup-XXX.tar.gz`

### Opción 2: Releases (Permanente - opcional)

Si habilitaste el paso de releases:

1. **Code → Releases** (lado derecho)
2. **Descarga el release**: `backup-2026-02-06_03-00-00`

---

## 📊 Qué Incluye Cada Backup

Cada archivo `.tar.gz` contiene:

```
backup-2026-02-06_03-00-00/
├── profiles.json
├── venues.json
├── courts.json
├── bookings.json
├── disabled_slots.json
├── subscriptions.json
├── payments.json
├── notifications.json
└── _BACKUP_SUMMARY.json
```

---

## 🔄 Restaurar un Backup

1. **Descarga el archivo** `.tar.gz` desde GitHub Actions

2. **Extrae el contenido**:
   ```bash
   tar -xzf database-backup-123.tar.gz
   ```

3. **Ve a Supabase SQL Editor**
   ```
   https://app.supabase.com/project/aynoabizwajdhrxjnhgq/sql
   ```

4. **Importa cada tabla** desde el Table Editor:
   - Supabase → Table Editor → Selecciona tabla
   - Insert → Import via spreadsheet
   - Pega contenido del JSON
   - Save

---

## ⚙️ Personalización del Workflow

### Cambiar Frecuencia

Edita la línea `cron:` en el archivo:

```yaml
schedule:
  # Formato: minuto hora día-mes mes día-semana
  - cron: '0 3 * * 0'  # Domingos 3am
  
  # Ejemplos:
  - cron: '0 2 * * *'  # Diario a las 2am
  - cron: '0 3 * * 1'  # Lunes a las 3am
  - cron: '0 0 * * 1,4'  # Lunes y Jueves a medianoche
  - cron: '0 */6 * * *'  # Cada 6 horas
```

### Cambiar Retención

```yaml
retention-days: 30  # Cambiar a 7, 14, 60, 90, etc.
```

### Agregar Notificación por Email

Reemplaza el step "Notify on failure" con:

```yaml
- name: Send email on failure
  if: failure()
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp-relay.brevo.com
    server_port: 587
    username: ${{ secrets.SMTP_USER }}
    password: ${{ secrets.SMTP_PASS }}
    subject: ❌ Backup Falló - TuCancha
    body: El backup automático falló. Revisar logs en GitHub Actions.
    to: tu-email@example.com
    from: noreply@tucancha.com.py
```

---

## 🛡️ Seguridad

### ✅ Buenas Prácticas Implementadas

- ✅ Secrets nunca se exponen en logs
- ✅ Artifacts son privados (solo accesibles para ti)
- ✅ Backups se comprimen antes de subir
- ✅ Retención automática (30 días)

### ⚠️ Consideraciones

- Los backups contienen **datos sensibles** (emails, teléfonos)
- Solo comparte backups con personas autorizadas
- Elimina backups viejos si cambiaste de repo público

---

## 📈 Monitoreo

### Ver Historial de Backups

```
GitHub → Actions → Weekly Database Backup
```

Verás una lista con:
- ✅ Exitosos (verde)
- ❌ Fallidos (rojo)
- ⏸️ En progreso (amarillo)

### Verificar Último Backup

```bash
# Desde GitHub CLI (opcional)
gh run list --workflow=weekly-backup.yml --limit 1
```

---

## 🆘 Troubleshooting

### Error: "Missing secrets"

**Solución**: Verificar que agregaste los 2 secrets en Settings → Secrets

### Error: "Permission denied"

**Solución**: Settings → Actions → General → Workflow permissions → "Read and write"

### Workflow no se ejecuta automáticamente

**Posibles causas**:
1. El repo está inactivo (GitHub pausó workflows)
2. La branch principal no es `main` (editar `workflow_dispatch`)
3. El workflow tiene errores de sintaxis

**Solución**: Ejecutar manualmente una vez para activar

---

## 💡 Recomendaciones

### Para Iniciar (0-3 meses)
- ✅ Backups automáticos semanales (domingos)
- ✅ Retención: 30 días
- ✅ Sin releases (solo artifacts)

### Para Producción Estable (3+ meses)
- ✅ Backups automáticos diarios
- ✅ Retención: 90 días
- ✅ Habilitar releases para backups mensuales
- ✅ Configurar notificaciones por email

---

## 📞 Próximos Pasos

1. **Ahora**: Configurar secrets en GitHub (5 min)
2. **Hoy**: Ejecutar backup manual para probar
3. **Este domingo**: Verificar que backup automático funcionó
4. **Mes 1**: Revisar que backups se crean correctamente

---

¡Tus datos están protegidos! 🛡️
