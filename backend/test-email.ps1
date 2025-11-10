# Script de prueba para enviar correo de prueba localmente
# Uso: .\test-email.ps1 -email "tu-email@ejemplo.com"

param(
    [Parameter(Mandatory=$true)]
    [string]$email
)

Write-Host "🧪 Probando envío de correo a: $email" -ForegroundColor Cyan
Write-Host ""

# Probar endpoint de prueba
try {
    $uri = "http://localhost:4000/email/test?to=$email"
    Write-Host "📤 Enviando petición a: $uri" -ForegroundColor Yellow
    
    $response = Invoke-WebRequest -Uri $uri -UseBasicParsing -ErrorAction Stop
    
    Write-Host "✅ Respuesta recibida:" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | Format-List
    
} catch {
    Write-Host "❌ Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Detalles:" -ForegroundColor Yellow
        Write-Host $responseBody
    }
    
    Write-Host ""
    Write-Host "💡 Asegúrate de que:" -ForegroundColor Yellow
    Write-Host "   1. El servidor esté corriendo (npm run start:dev)" -ForegroundColor Yellow
    Write-Host "   2. NODE_ENV !== 'production'" -ForegroundColor Yellow
    Write-Host "   3. RESEND_API_KEY esté configurada en .env" -ForegroundColor Yellow
}

