Param(
    [switch]$SkipPostgres
)

Write-Host "=== Setup e-Go (entorno de desarrollo) ===" -ForegroundColor Cyan

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "Raíz del proyecto:" $root

Write-Host ""
Write-Host "1) Comprobando Node.js..." -ForegroundColor Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Warning "Node.js no está instalado o no está en el PATH."
    Write-Warning "Instálalo desde https://nodejs.org antes de seguir."
} else {
    $nodeVersion = node -v
    Write-Host "Node encontrado:" $nodeVersion
}

Write-Host ""
Write-Host "2) Instalando dependencias del backend..." -ForegroundColor Yellow
Push-Location (Join-Path $root "backend")
if (Test-Path "package.json") {
    npm install
} else {
    Write-Warning "No se ha encontrado backend/package.json. ¿Seguro que estás en la carpeta correcta?"
}
Pop-Location

Write-Host ""
Write-Host "3) Instalando dependencias del frontend..." -ForegroundColor Yellow
Push-Location (Join-Path $root "frontend")
if (Test-Path "package.json") {
    npm install
} else {
    Write-Warning "No se ha encontrado frontend/package.json."
}
Pop-Location

if (-not $SkipPostgres) {
    Write-Host ""
    Write-Host "4) Comprobando PostgreSQL..." -ForegroundColor Yellow
    if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
        Write-Host "No parece que PostgreSQL esté instalado (no se encuentra 'psql')."
        Write-Host "Intentando instalar PostgreSQL 16 con winget..."
        Write-Host "(Si ya lo tienes o no quieres instalarlo ahora, cierra esta ventana.)"
        try {
            winget install -e --id PostgreSQL.PostgreSQL.16
        } catch {
            Write-Warning "No se ha podido lanzar la instalación con winget. Puedes instalarlo tú manualmente."
        }
    } else {
        Write-Host "PostgreSQL ya está disponible (psql encontrado)."
    }
} else {
    Write-Host ""
    Write-Host "4) Saltando instalación/comprobación de PostgreSQL (SkipPostgres)." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Listo. Cosas típicas que harás después:" -ForegroundColor Green
Write-Host " - Backend:  cd backend; npx nodemon index.jsx"
Write-Host " - Frontend: cd frontend; npm start"

