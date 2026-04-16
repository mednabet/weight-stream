<#
.SYNOPSIS
    Script d'installation Weight Stream pour Windows
    Auteur: NETPROCESS (https://netprocess.ma)
    Developpeur: Mohammed NABET (+212 661 550 618)
    Version: 4.1.0

.DESCRIPTION
    Ce script installe et configure Weight Stream sur un environnement Windows.
    Il verifie les prerequis (Node.js, Git, MySQL), clone le depot, installe
    les dependances, configure les variables d'environnement, effectue le build
    de production et cree les scripts de lancement.

.PARAMETER AppDir
    Repertoire d'installation. Par defaut : C:\WeightStream

.PARAMETER ServerName
    Nom de domaine ou adresse IP du serveur. Par defaut : localhost

.PARAMETER SkipBuild
    Ignorer le build de production (mode developpement uniquement)

.NOTES
    L'execution de ce script necessite des privileges d'administrateur.
    Prerequis manuels avant de lancer ce script :
      - Node.js 22.x  : https://nodejs.org/
      - Git            : https://git-scm.com/
      - MySQL 8.0+     : https://dev.mysql.com/downloads/installer/

.EXAMPLE
    .\install-windows.ps1
    .\install-windows.ps1 -AppDir "D:\Apps\WeightStream" -ServerName "192.168.1.100"
#>

param(
    [string]$AppDir = "C:\WeightStream",
    [string]$ServerName = "localhost",
    [switch]$SkipBuild = $false
)

# ─────────────────────────────────────────────────────────────────────────────
# Verification des privileges administrateur
# ─────────────────────────────────────────────────────────────────────────────
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Warning "Ce script doit etre execute en tant qu'Administrateur."
    Write-Host "Clic droit sur PowerShell -> 'Executer en tant qu'administrateur'" -ForegroundColor Yellow
    Read-Host "Appuyez sur Entree pour quitter"
    Exit 1
}

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# ─────────────────────────────────────────────────────────────────────────────
# Fonctions utilitaires
# ─────────────────────────────────────────────────────────────────────────────
function Write-Step   { param([string]$m) Write-Host "`n=== $m ===" -ForegroundColor Cyan }
function Write-OK     { param([string]$m) Write-Host "[OK]   $m" -ForegroundColor Green }
function Write-Warn   { param([string]$m) Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Write-Err    { param([string]$m) Write-Host "[ERR]  $m" -ForegroundColor Red }
function Write-Info   { param([string]$m) Write-Host "[INFO] $m" -ForegroundColor White }

function Fail {
    param([string]$m)
    Write-Host "[ECHEC] $m" -ForegroundColor Red
    Read-Host "Appuyez sur Entree pour quitter"
    Exit 1
}

function Get-RandomPassword {
    param([int]$Length = 24)
    $chars = (48..57) + (65..90) + (97..122)   # 0-9, A-Z, a-z
    return -join ($chars | Get-Random -Count $Length | ForEach-Object { [char]$_ })
}

function Test-Command {
    param([string]$Command)
    return [bool](Get-Command $Command -ErrorAction SilentlyContinue)
}

# ─────────────────────────────────────────────────────────────────────────────
# Banniere
# ─────────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Weight Stream v4.1.0 - Installation Windows" -ForegroundColor Cyan
Write-Host "  Auteur : NETPROCESS (https://netprocess.ma)" -ForegroundColor Cyan
Write-Host "  Dev    : Mohammed NABET (+212 661 550 618)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Repertoire d'installation : $AppDir"
Write-Host "  Serveur                   : $ServerName"
Write-Host ""

# ─────────────────────────────────────────────────────────────────────────────
# ETAPE 1 — Verification des prerequis
# ─────────────────────────────────────────────────────────────────────────────
Write-Step "ETAPE 1 — Verification des prerequis"

# Node.js
if (-not (Test-Command "node")) {
    Fail "Node.js n'est pas installe ou absent du PATH.`n  Telechargez Node.js 22.x sur : https://nodejs.org/"
}
$nodeVer = (node -v 2>&1)
Write-OK "Node.js detecte : $nodeVer"

# npm
if (-not (Test-Command "npm")) {
    Fail "npm n'est pas disponible. Reinstallez Node.js."
}
$npmVer = (npm -v 2>&1)
Write-OK "npm detecte : $npmVer"

# Git
if (-not (Test-Command "git")) {
    Fail "Git n'est pas installe ou absent du PATH.`n  Telechargez Git sur : https://git-scm.com/"
}
$gitVer = (git --version 2>&1)
Write-OK "Git detecte : $gitVer"

# MySQL
$mysqlAvailable = Test-Command "mysql"
if (-not $mysqlAvailable) {
    Write-Warn "mysql.exe absent du PATH."
    Write-Host "  Assurez-vous que MySQL 8.0+ est installe et que son dossier bin est dans le PATH." -ForegroundColor Yellow
    Write-Host "  Telechargez MySQL sur : https://dev.mysql.com/downloads/installer/" -ForegroundColor Yellow
    $rep = Read-Host "Continuer sans configurer MySQL automatiquement ? (O/N)"
    if ($rep -notmatch "^[OoYy]") { Exit 1 }
} else {
    $mysqlVer = (mysql -V 2>&1)
    Write-OK "MySQL detecte : $mysqlVer"
}

# ─────────────────────────────────────────────────────────────────────────────
# ETAPE 2 — Configuration de la base de donnees MySQL
# ─────────────────────────────────────────────────────────────────────────────
$DbName = "production_manager"
$DbUser = "prod_app"
$DbPass = Get-RandomPassword -Length 24
$FrontendPort = 8080
$BackendPort  = 3001
$DbConfigured = $false

if ($mysqlAvailable) {
    Write-Step "ETAPE 2 — Configuration MySQL"
    Write-Host "Entrez le mot de passe root MySQL pour creer la base de donnees."
    Write-Host "(Laissez vide si le root MySQL n'a pas de mot de passe)" -ForegroundColor Yellow

    $secureRootPass = Read-Host -AsSecureString "Mot de passe root MySQL"
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureRootPass)
    $rootPassPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

    # Utiliser un fichier de config MySQL pour eviter le mot de passe en clair dans la ligne de commande
    $tmpCnf = Join-Path $env:TEMP "ws_mysql_$([System.Guid]::NewGuid().ToString('N')).cnf"
    $sqlFile = Join-Path $env:TEMP "ws_setup_$([System.Guid]::NewGuid().ToString('N')).sql"

    @"
[client]
user=root
password="$rootPassPlain"
"@ | Set-Content -Path $tmpCnf -Encoding ASCII

    @"
CREATE DATABASE IF NOT EXISTS ``$DbName`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DbUser'@'localhost' IDENTIFIED BY '$DbPass';
ALTER USER '$DbUser'@'localhost' IDENTIFIED BY '$DbPass';
GRANT ALL PRIVILEGES ON ``$DbName``.* TO '$DbUser'@'localhost';
FLUSH PRIVILEGES;
"@ | Set-Content -Path $sqlFile -Encoding UTF8

    # Tester la connexion root
    mysql "--defaults-extra-file=$tmpCnf" -e "SELECT VERSION();" 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Remove-Item $tmpCnf, $sqlFile -Force -ErrorAction SilentlyContinue
        $rootPassPlain = $null
        Fail "Connexion MySQL root echouee. Verifiez le mot de passe root."
    }
    Write-OK "Connexion MySQL root validee."

    # Executer le script SQL
    Get-Content -Path $sqlFile -Raw | mysql "--defaults-extra-file=$tmpCnf"
    if ($LASTEXITCODE -ne 0) {
        Remove-Item $tmpCnf, $sqlFile -Force -ErrorAction SilentlyContinue
        $rootPassPlain = $null
        Fail "Creation de la base MySQL echouee."
    }

    Remove-Item $tmpCnf, $sqlFile -Force -ErrorAction SilentlyContinue
    $rootPassPlain = $null
    Write-OK "Base '$DbName' et utilisateur '$DbUser' crees."
    $DbConfigured = $true
} else {
    Write-Warn "Configuration MySQL ignoree (mysql.exe absent du PATH)."
    Write-Host "  Creez manuellement la base de donnees avec ce SQL :" -ForegroundColor Yellow
    Write-Host "    CREATE DATABASE $DbName CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" -ForegroundColor Gray
    Write-Host "    CREATE USER '$DbUser'@'localhost' IDENTIFIED BY '<mot_de_passe>';" -ForegroundColor Gray
    Write-Host "    GRANT ALL PRIVILEGES ON $DbName.* TO '$DbUser'@'localhost';" -ForegroundColor Gray
    Write-Host "    FLUSH PRIVILEGES;" -ForegroundColor Gray
}

# ─────────────────────────────────────────────────────────────────────────────
# ETAPE 3 — Clonage du depot
# ─────────────────────────────────────────────────────────────────────────────
Write-Step "ETAPE 3 — Clonage du depot GitHub"

$RepoUrl = "https://github.com/mednabet/weight-stream.git"
$AppDirFull = Join-Path $AppDir "weight-stream"

if (Test-Path $AppDirFull) {
    Write-Warn "Le dossier '$AppDirFull' existe deja."
    $rep = Read-Host "Le supprimer et recommencer l'installation ? (O/N)"
    if ($rep -match "^[OoYy]") {
        Write-Info "Suppression de $AppDirFull..."
        Remove-Item -Path $AppDirFull -Recurse -Force
    } else {
        Fail "Installation annulee par l'utilisateur."
    }
}

if (-not (Test-Path $AppDir)) {
    New-Item -Path $AppDir -ItemType Directory -Force | Out-Null
}

Write-Info "Clonage depuis $RepoUrl..."
git clone $RepoUrl $AppDirFull
if ($LASTEXITCODE -ne 0) {
    Fail "Echec du clonage. Verifiez votre connexion internet et l'URL du depot."
}
Write-OK "Depot clone dans $AppDirFull"

# ─────────────────────────────────────────────────────────────────────────────
# ETAPE 4 — Generation du fichier .env
# ─────────────────────────────────────────────────────────────────────────────
Write-Step "ETAPE 4 — Configuration de l'environnement"

$ServerDir = Join-Path $AppDirFull "server"
if (-not (Test-Path $ServerDir)) {
    Fail "Le dossier server est introuvable dans $AppDirFull."
}

$JwtSecret = Get-RandomPassword -Length 64
$corsOrigin = if ($ServerName -eq "localhost") { "http://localhost:$FrontendPort" } else { "http://$ServerName" }

@"
# ─── Base de donnees MySQL ────────────────────────────────────────────────────
DB_HOST=localhost
DB_PORT=3306
DB_NAME=$DbName
DB_USER=$DbUser
DB_PASSWORD=$DbPass

# ─── Serveur ──────────────────────────────────────────────────────────────────
PORT=$BackendPort
NODE_ENV=production
CORS_ORIGIN=$corsOrigin

# ─── Securite ─────────────────────────────────────────────────────────────────
JWT_SECRET=$JwtSecret
"@ | Set-Content -Path (Join-Path $ServerDir ".env") -Encoding UTF8

Write-OK "Fichier .env genere : $ServerDir\.env"

# ─────────────────────────────────────────────────────────────────────────────
# ETAPE 5 — Installation des dependances
# ─────────────────────────────────────────────────────────────────────────────
Write-Step "ETAPE 5 — Installation des dependances"

Write-Info "Installation des dependances Frontend..."
Set-Location $AppDirFull
npm install
if ($LASTEXITCODE -ne 0) { Fail "npm install frontend a echoue." }
Write-OK "Dependances frontend installees."

Write-Info "Installation des dependances Backend..."
Set-Location $ServerDir
npm install
if ($LASTEXITCODE -ne 0) { Fail "npm install backend a echoue." }
Write-OK "Dependances backend installees."

# ─────────────────────────────────────────────────────────────────────────────
# ETAPE 6 — Build de production
# ─────────────────────────────────────────────────────────────────────────────
if (-not $SkipBuild) {
    Write-Step "ETAPE 6 — Build de production"

    Write-Info "Build du Frontend React..."
    Set-Location $AppDirFull
    npm run build
    if ($LASTEXITCODE -ne 0) { Fail "npm run build frontend a echoue." }
    Write-OK "Frontend compile dans $AppDirFull\dist"

    Write-Info "Build du Backend Node.js..."
    Set-Location $ServerDir
    npm run build
    if ($LASTEXITCODE -ne 0) { Fail "npm run build backend a echoue." }
    Write-OK "Backend compile dans $ServerDir\dist"
} else {
    Write-Warn "Build ignore (mode -SkipBuild). L'application demarrera en mode developpement."
}

# ─────────────────────────────────────────────────────────────────────────────
# ETAPE 7 — Installation de 'serve' pour le frontend statique
# ─────────────────────────────────────────────────────────────────────────────
Write-Step "ETAPE 7 — Installation du serveur de fichiers statiques"
Write-Info "Installation de 'serve' (serveur frontend statique)..."
npm install -g serve 2>&1 | Out-Null
Write-OK "'serve' installe globalement."

# ─────────────────────────────────────────────────────────────────────────────
# ETAPE 8 — Creation des scripts de lancement
# ─────────────────────────────────────────────────────────────────────────────
Write-Step "ETAPE 8 — Creation des scripts de lancement"

# start.bat — Production
@"
@echo off
title Weight Stream
cd /d "%~dp0"

echo ============================================================
echo   Weight Stream - Lancement Production
echo   Auteur: NETPROCESS (https://netprocess.ma)
echo ============================================================
echo.

if not exist "server\dist\index.js" (
    echo [ERREUR] Build backend introuvable. Relancez install-windows.ps1.
    pause & exit /b 1
)
if not exist "dist\index.html" (
    echo [ERREUR] Build frontend introuvable. Relancez install-windows.ps1.
    pause & exit /b 1
)

echo [INFO] Demarrage du Backend sur le port $BackendPort...
start "WeightStream-Backend" cmd /k "cd /d ""%~dp0server"" && node dist\index.js"

timeout /t 3 /nobreak >nul

echo [INFO] Demarrage du Frontend sur le port $FrontendPort...
start "WeightStream-Frontend" cmd /k "cd /d ""%~dp0"" && npx --yes serve -s dist -l $FrontendPort"

echo.
echo ============================================================
echo   Application disponible sur : http://localhost:$FrontendPort
echo ============================================================
echo.
pause
"@ | Set-Content -Path (Join-Path $AppDirFull "start.bat") -Encoding ASCII

# start-dev.bat — Developpement
@"
@echo off
title Weight Stream DEV
cd /d "%~dp0"

echo ============================================================
echo   Weight Stream - Mode Developpement
echo   Auteur: NETPROCESS (https://netprocess.ma)
echo ============================================================
echo.

echo [INFO] Demarrage du Backend (dev, port $BackendPort)...
start "WeightStream-Backend-Dev" cmd /k "cd /d ""%~dp0server"" && npm run dev"

timeout /t 3 /nobreak >nul

echo [INFO] Demarrage du Frontend (dev, port $FrontendPort)...
start "WeightStream-Frontend-Dev" cmd /k "cd /d ""%~dp0"" && npm run dev"

echo.
echo ============================================================
echo   Frontend : http://localhost:$FrontendPort
echo   Backend  : http://localhost:$BackendPort
echo ============================================================
echo.
pause
"@ | Set-Content -Path (Join-Path $AppDirFull "start-dev.bat") -Encoding ASCII

# stop.bat — Arret des services
@"
@echo off
echo [INFO] Arret des services Weight Stream...
taskkill /FI "WINDOWTITLE eq WeightStream-Backend*" /F >nul 2>nul
taskkill /FI "WINDOWTITLE eq WeightStream-Frontend*" /F >nul 2>nul
echo [OK] Services arretes.
pause
"@ | Set-Content -Path (Join-Path $AppDirFull "stop.bat") -Encoding ASCII

Write-OK "start.bat     — Lancement production"
Write-OK "start-dev.bat — Lancement developpement"
Write-OK "stop.bat      — Arret des services"

# ─────────────────────────────────────────────────────────────────────────────
# Resume final
# ─────────────────────────────────────────────────────────────────────────────
Set-Location $AppDirFull

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Installation terminee avec succes !" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Application  : Weight Stream v4.1.0" -ForegroundColor Cyan
Write-Host "  Auteur       : NETPROCESS (https://netprocess.ma)" -ForegroundColor Cyan
Write-Host "  Repertoire   : $AppDirFull" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Base de donnees MySQL :" -ForegroundColor Yellow
Write-Host "    Base : $DbName"
Write-Host "    User : $DbUser"
Write-Host "    Pass : (sauvegarde dans $ServerDir\.env)"
if (-not $DbConfigured) {
    Write-Host ""
    Write-Warn "La base de donnees n'a pas ete configuree automatiquement."
    Write-Host "  Mettez a jour manuellement le mot de passe dans : $ServerDir\.env" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "  Scripts de lancement :" -ForegroundColor Yellow
Write-Host "    Production    : $AppDirFull\start.bat"
Write-Host "    Developpement : $AppDirFull\start-dev.bat"
Write-Host "    Arret         : $AppDirFull\stop.bat"
Write-Host ""
Write-Host "  Acces : http://$ServerName`:$FrontendPort" -ForegroundColor Green
Write-Host "  Le premier utilisateur inscrit deviendra automatiquement administrateur." -ForegroundColor Green
Write-Host ""
