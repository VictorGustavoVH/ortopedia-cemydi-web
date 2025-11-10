# Script para verificar conexión a PostgreSQL
Write-Host "=== Verificando conexión a PostgreSQL ===" -ForegroundColor Cyan

# Cargar variables de entorno desde .env
if (Test-Path ".env") {
    Write-Host "✓ Archivo .env encontrado" -ForegroundColor Green
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]*?)\s*=\s*(.*?)\s*$') {
            $name = $matches[1]
            $value = $matches[2] -replace '^["\']|["\']$'
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
    
    $dbUrl = [Environment]::GetEnvironmentVariable("DATABASE_URL", "Process")
    if ($dbUrl) {
        Write-Host "✓ DATABASE_URL encontrada" -ForegroundColor Green
        # Ocultar contraseña en el output
        $dbUrlSafe = $dbUrl -replace ':[^:@]+@', ':****@'
        Write-Host "  URL: $dbUrlSafe" -ForegroundColor Gray
    } else {
        Write-Host "✗ DATABASE_URL no encontrada" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✗ Archivo .env no encontrado" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Probando conexión con Prisma ===" -ForegroundColor Cyan
cd backend
npx prisma db pull --schema=prisma/schema.prisma 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ ¡Conexión exitosa!" -ForegroundColor Green
} else {
    Write-Host "`n✗ Error en la conexión" -ForegroundColor Red
    Write-Host "`nPosibles causas:" -ForegroundColor Yellow
    Write-Host "1. PostgreSQL no está corriendo" -ForegroundColor Gray
    Write-Host "2. Usuario/contraseña incorrectos" -ForegroundColor Gray
    Write-Host "3. Base de datos 'bd_ortopedia_cemydi' no existe" -ForegroundColor Gray
    Write-Host "4. Puerto incorrecto (debe ser 5432)" -ForegroundColor Gray
}

