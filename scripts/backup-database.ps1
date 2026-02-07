# ==============================================================================
# Script de Backup Manual para TuCancha (PowerShell)
# 
# Exporta todas las tablas críticas de Supabase a archivos JSON
# Ejecutar: .\scripts\backup-database.ps1
# ==============================================================================

# Configuración
$ErrorActionPreference = "Continue"

# Cargar variables de entorno
$envFile = Join-Path $PSScriptRoot "..\\.env.local"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^([^=]+)=(.*)$") {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
} else {
    Write-Host "❌ Error: .env.local no encontrado" -ForegroundColor Red
    exit 1
}

$SUPABASE_URL = $env:NEXT_PUBLIC_SUPABASE_URL
$SUPABASE_ANON_KEY = $env:NEXT_PUBLIC_SUPABASE_ANON_KEY

if (-not $SUPABASE_URL -or -not $SUPABASE_ANON_KEY) {
    Write-Host "❌ Error: Variables de entorno no configuradas" -ForegroundColor Red
    exit 1
}

# Tablas a respaldar
$tables = @(
    "profiles",
    "venues",
    "courts",
    "bookings",
    "disabled_slots",
    "subscriptions",
    "payments",
    "notifications"
)

# Crear carpeta de backup
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupDir = Join-Path $PSScriptRoot "..\backups\$timestamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

Write-Host "🔄 Iniciando backup de base de datos...`n" -ForegroundColor Cyan

$totalRecords = 0
$successCount = 0
$summary = @()

# Exportar cada tabla
foreach ($table in $tables) {
    Write-Host "📦 Exportando tabla: $table..." -ForegroundColor Yellow
    
    $url = "$SUPABASE_URL/rest/v1/$table`?select=*"
    
    try {
        $response = Invoke-RestMethod -Uri $url -Method Get -Headers @{
            "apikey" = $SUPABASE_ANON_KEY
            "Authorization" = "Bearer $SUPABASE_ANON_KEY"
            "Content-Type" = "application/json"
        }
        
        $filePath = Join-Path $backupDir "$table.json"
        $response | ConvertTo-Json -Depth 10 | Out-File -FilePath $filePath -Encoding UTF8
        
        $recordCount = $response.Count
        $totalRecords += $recordCount
        $successCount++
        
        Write-Host "   ✅ $recordCount registros exportados → $table.json" -ForegroundColor Green
        
        $summary += @{
            table = $table
            records = $recordCount
            status = "success"
        }
    }
    catch {
        Write-Host "   ❌ Error exportando $table : $_" -ForegroundColor Red
        $summary += @{
            table = $table
            records = 0
            status = "failed"
        }
    }
}

# Crear archivo de resumen
$summaryData = @{
    timestamp = (Get-Date).ToString("o")
    totalTables = $tables.Count
    successfulTables = $successCount
    totalRecords = $totalRecords
    tables = $summary
}

$summaryPath = Join-Path $backupDir "_BACKUP_SUMMARY.json"
$summaryData | ConvertTo-Json -Depth 5 | Out-File -FilePath $summaryPath -Encoding UTF8

# Resumen final
Write-Host "`n$('=' * 50)" -ForegroundColor Cyan
Write-Host "✅ BACKUP COMPLETADO" -ForegroundColor Green
Write-Host "$('=' * 50)" -ForegroundColor Cyan
Write-Host "📁 Carpeta: $backupDir"
Write-Host "📊 Tablas exportadas: $successCount/$($tables.Count)"
Write-Host "📝 Total de registros: $totalRecords"
Write-Host "$('=' * 50)`n" -ForegroundColor Cyan

Write-Host "💡 Para restaurar este backup:" -ForegroundColor Yellow
Write-Host "   1. Ve a Supabase SQL Editor"
Write-Host "   2. Elimina datos: DELETE FROM <tabla> WHERE true;"
Write-Host "   3. Importa el JSON desde $backupDir"
Write-Host ""
