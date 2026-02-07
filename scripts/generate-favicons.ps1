# Script para generar favicons optimizados desde el logo principal
# Uso: .\scripts\generate-favicons.ps1

Write-Host "Generando favicons optimizados para TuCancha..." -ForegroundColor Cyan
Write-Host ""

# Rutas
$projectRoot = Split-Path -Parent $PSScriptRoot
$sourceLogo = Join-Path $projectRoot "public\logo.png"
$publicDir = Join-Path $projectRoot "public"

# Verificar que existe el logo fuente
if (-not (Test-Path $sourceLogo)) {
    Write-Host "Error: No se encontro el logo en $sourceLogo" -ForegroundColor Red
    exit 1
}

Write-Host "Logo encontrado: $sourceLogo" -ForegroundColor Green

# Funcion para redimensionar imagen usando .NET
function Resize-Image {
    param (
        [string]$SourcePath,
        [string]$TargetPath,
        [int]$Width,
        [int]$Height
    )
    
    Add-Type -AssemblyName System.Drawing
    
    try {
        # Cargar imagen original
        $sourceImage = [System.Drawing.Image]::FromFile($SourcePath)
        
        # Crear bitmap redimensionado con alta calidad
        $targetImage = New-Object System.Drawing.Bitmap($Width, $Height)
        $graphics = [System.Drawing.Graphics]::FromImage($targetImage)
        
        # Configurar calidad de renderizado
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        
        # Dibujar imagen redimensionada
        $graphics.DrawImage($sourceImage, 0, 0, $Width, $Height)
        
        # Guardar como PNG
        $targetImage.Save($TargetPath, [System.Drawing.Imaging.ImageFormat]::Png)
        
        # Liberar recursos
        $graphics.Dispose()
        $targetImage.Dispose()
        $sourceImage.Dispose()
        
        return $true
    }
    catch {
        Write-Host "Error redimensionando a ${Width}x${Height}: $_" -ForegroundColor Red
        return $false
    }
}

# Configuracion de tamanos a generar
$favicons = @(
    @{ Name = "favicon-16x16.png"; Size = 16; Description = "Favicon 16x16 (pestanas navegador)" },
    @{ Name = "favicon-32x32.png"; Size = 32; Description = "Favicon 32x32 (escritorio)" },
    @{ Name = "favicon-192x192.png"; Size = 192; Description = "Favicon 192x192 (Android)" },
    @{ Name = "apple-touch-icon.png"; Size = 180; Description = "Apple Touch Icon (iOS)" }
)

# Generar cada favicon
$successCount = 0
$totalCount = $favicons.Count

foreach ($favicon in $favicons) {
    $targetPath = Join-Path $publicDir $favicon.Name
    Write-Host "Generando $($favicon.Name) ($($favicon.Size)x$($favicon.Size))..." -NoNewline
    
    $success = Resize-Image -SourcePath $sourceLogo -TargetPath $targetPath -Width $favicon.Size -Height $favicon.Size
    
    if ($success) {
        $fileSize = (Get-Item $targetPath).Length
        $fileSizeKB = [Math]::Round($fileSize / 1KB, 2)
        Write-Host " OK ($fileSizeKB KB)" -ForegroundColor Green
        $successCount++
    }
    else {
        Write-Host " FALLO" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Resumen:" -ForegroundColor Cyan
Write-Host "   Total de favicons: $totalCount" -ForegroundColor White
Write-Host "   Generados exitosamente: $successCount" -ForegroundColor Green
Write-Host "   Fallidos: $($totalCount - $successCount)" -ForegroundColor $(if ($successCount -eq $totalCount) { "Gray" } else { "Red" })
Write-Host "============================================" -ForegroundColor Cyan

if ($successCount -eq $totalCount) {
    Write-Host ""
    Write-Host "Todos los favicons se generaron correctamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Proximos pasos:" -ForegroundColor Yellow
    Write-Host "   1. Los archivos estan en: $publicDir" -ForegroundColor White
    Write-Host "   2. La configuracion en app/layout.tsx ya esta actualizada" -ForegroundColor White
    Write-Host "   3. Ejecuta 'npm run dev' para verificar los favicons" -ForegroundColor White
    exit 0
}
else {
    Write-Host ""
    Write-Host "Algunos favicons no se pudieron generar." -ForegroundColor Yellow
    Write-Host "Revisa los errores arriba para mas detalles." -ForegroundColor White
    exit 1
}
