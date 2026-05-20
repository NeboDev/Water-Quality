# ============================================
# Script para crear usuarios en Mosquitto (Docker)
# Para tu configuración específica
# ============================================

$containerName = "mosquitto"
$passwdPath = "/mosquitto/config/passwd"

Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   CREAR USUARIOS MOSQUITTO - DOCKER   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Verificar que el contenedor está corriendo
docker ps --format "table {{.Names}}" | findstr $containerName | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: El contenedor '$containerName' no está corriendo" -ForegroundColor Red
    Write-Host "Ejecuta: docker-compose up -d" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Contenedor encontrado: $containerName`n" -ForegroundColor Green

$users = @()
$agregar = $true

while ($agregar) {
    Write-Host "──────────────────────────────────────" -ForegroundColor Cyan
    Write-Host "Nuevo usuario:" -ForegroundColor Cyan

    $username = Read-Host "  Usuario"

    if ([string]::IsNullOrWhiteSpace($username)) {
        Write-Host "❌ El usuario no puede estar vacío" -ForegroundColor Red
        continue
    }

    $password = Read-Host "  Contraseña"

    if ([string]::IsNullOrWhiteSpace($password)) {
        Write-Host "❌ La contraseña no puede estar vacía" -ForegroundColor Red
        continue
    }

    # Confirmar contraseña
    $password2 = Read-Host "  Confirmar contraseña"

    if ($password -ne $password2) {
        Write-Host "❌ Las contraseñas no coinciden" -ForegroundColor Red
        continue
    }

    $users += @{ user = $username; pass = $password }
    Write-Host "✓ Usuario agregado: $username`n" -ForegroundColor Green

    $otra = Read-Host "¿Agregar otro usuario? [S/N]"
    if ($otra -eq "N" -or $otra -eq "n") {
        $agregar = $false
    }
}

# Crear los usuarios en el contenedor
Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        CREANDO USUARIOS EN DOCKER      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝`n" -ForegroundColor Cyan

$exitoCount = 0

foreach ($user in $users) {
    Write-Host "Creando usuario: $($user.user)..." -ForegroundColor Yellow

    # Ejecutar el comando dentro del contenedor
    $cmd = "docker exec $containerName mosquitto_passwd -b $passwdPath $($user.user) $($user.pass)"

    try {
        Invoke-Expression $cmd | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ $($user.user) creado exitosamente" -ForegroundColor Green
            $exitoCount++
        } else {
            Write-Host "  ❌ Error al crear $($user.user)" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "  ❌ Error: $_" -ForegroundColor Red
    }
}

Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║            ✅ COMPLETADO              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "Usuarios creados exitosamente: $exitoCount / $($users.Count)" -ForegroundColor Green
Write-Host "Archivo passwd en el contenedor: $passwdPath`n" -ForegroundColor Yellow

# Opcional: Reiniciar Mosquitto para aplicar cambios
$reiniciar = Read-Host "¿Reiniciar Mosquitto para aplicar cambios? [S/N]"
if ($reiniciar -eq "S" -or $reiniciar -eq "s") {
    Write-Host "Reiniciando Mosquitto..." -ForegroundColor Yellow
    docker restart $containerName
    Write-Host "✓ Mosquitto reiniciado`n" -ForegroundColor Green
}

Write-Host "📋 Usuarios registrados:" -ForegroundColor Cyan
foreach ($user in $users) {
    Write-Host "  • $($user.user)" -ForegroundColor Yellow
}
Write-Host "`n"
