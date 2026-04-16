# ============================================
# INSTALLATION WEIGHT STREAM - WINDOWS SIMPLE
# Pré-requis déjà installés :
# - git
# - node / npm / npx
# - mysql
# ============================================

$ErrorActionPreference = "Stop"

# ------------------------------------------------------------
# CONFIG
# ------------------------------------------------------------
$AppDir = "C:\WeightStream\weight-stream"
$RepoUrl = "https://github.com/mednabet/weight-stream.git"

$DbName = "production_manager"
$DbUser = "prod_app"
$DbPass = "app123"
$RootPass = "toor"

$FrontendPort = 8080
$BackendPort  = 3001

# ------------------------------------------------------------
# HELPERS
# ------------------------------------------------------------
function Step($msg) {
    Write-Host ""
    Write-Host "=== $msg ===" -ForegroundColor Cyan
}

function Ok($msg) {
    Write-Host "[OK] $msg" -ForegroundColor Green
}

function Fail($msg) {
    Write-Host "[ERROR] $msg" -ForegroundColor Red
    exit 1
}

# ------------------------------------------------------------
# ADMIN CHECK
# ------------------------------------------------------------
$IsAdmin = (
    [Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()
).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $IsAdmin) {
    Fail "Ce script doit être exécuté en tant qu'Administrateur."
}

# ------------------------------------------------------------
# PRECHECKS
# ------------------------------------------------------------
Step "Vérification des prérequis"

try { $nodeVersion = node -v } catch { Fail "Node.js introuvable." }
try { $npmVersion  = npm -v } catch { Fail "npm introuvable." }
try { $gitVersion  = git --version } catch { Fail "Git introuvable." }
try { $mysqlVersion = mysql --version } catch { Fail "MySQL introuvable." }

Ok "Node.js détecté : $nodeVersion"
Ok "npm détecté : $npmVersion"
Ok "Git détecté : $gitVersion"
Ok "MySQL détecté : $mysqlVersion"

# ------------------------------------------------------------
# PREPARE INSTALL DIR
# ------------------------------------------------------------
Step "Préparation du dossier d'installation"

if (-not (Test-Path "C:\WeightStream")) {
    New-Item -Path "C:\WeightStream" -ItemType Directory -Force | Out-Null
}

if (Test-Path $AppDir) {
    Write-Host "Le dossier $AppDir existe déjà." -ForegroundColor Yellow
    $overwrite = Read-Host "Voulez-vous le supprimer et réinstaller ? (O/N)"
    if ($overwrite -match "^[OoYy]$") {
        Remove-Item -Path $AppDir -Recurse -Force
        Ok "Ancien dossier supprimé."
    } else {
        Fail "Installation annulée."
    }
}

# ------------------------------------------------------------
# CLONE REPO
# ------------------------------------------------------------
Step "Clonage du projet"

git clone $RepoUrl $AppDir
if ($LASTEXITCODE -ne 0) {
    Fail "Le clonage Git a échoué."
}
Ok "Projet cloné."

# ------------------------------------------------------------
# MYSQL SETUP
# ------------------------------------------------------------
Step "Configuration MySQL"

$tmpCnf = Join-Path $env:TEMP "weight_stream_mysql.cnf"
$sqlFile = Join-Path $env:TEMP "weight_stream_setup.sql"

@"
[client]
user=root
password="$RootPass"
"@ | Set-Content -Path $tmpCnf -Encoding ASCII

@"
CREATE DATABASE IF NOT EXISTS $DbName CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DbUser'@'localhost' IDENTIFIED BY '$DbPass';
ALTER USER '$DbUser'@'localhost' IDENTIFIED BY '$DbPass';
GRANT ALL PRIVILEGES ON $DbName.* TO '$DbUser'@'localhost';
FLUSH PRIVILEGES;
"@ | Set-Content -Path $sqlFile -Encoding UTF8

mysql "--defaults-extra-file=$tmpCnf" -e "SELECT VERSION();" | Out-Null
if ($LASTEXITCODE -ne 0) {
    Remove-Item $tmpCnf, $sqlFile -Force -ErrorAction SilentlyContinue
    Fail "Connexion MySQL root échouée."
}
Ok "Connexion MySQL root validée."

Get-Content -Path $sqlFile -Raw | mysql "--defaults-extra-file=$tmpCnf"
if ($LASTEXITCODE -ne 0) {
    Remove-Item $tmpCnf, $sqlFile -Force -ErrorAction SilentlyContinue
    Fail "Création de la base MySQL échouée."
}
Ok "Base et utilisateur MySQL créés."

Remove-Item $tmpCnf, $sqlFile -Force -ErrorAction SilentlyContinue

# ------------------------------------------------------------
# ENV FILE
# ------------------------------------------------------------
Step "Configuration de l'environnement"

$ServerDir = Join-Path $AppDir "server"
if (-not (Test-Path $ServerDir)) {
    Fail "Le dossier server est introuvable dans $AppDir."
}

$JwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object { [char]$_ })

@"
DB_HOST=localhost
DB_PORT=3306
DB_NAME=$DbName
DB_USER=$DbUser
DB_PASSWORD=$DbPass

PORT=$BackendPort
NODE_ENV=production
CORS_ORIGIN=http://localhost:$FrontendPort

JWT_SECRET=$JwtSecret
"@ | Set-Content -Path (Join-Path $ServerDir ".env") -Encoding UTF8

Ok "Fichier .env créé."

# ------------------------------------------------------------
# INSTALL + BUILD
# ------------------------------------------------------------
Step "Installation et build du frontend"

Set-Location $AppDir
npm install
if ($LASTEXITCODE -ne 0) { Fail "npm install frontend a échoué." }

npm run build
if ($LASTEXITCODE -ne 0) { Fail "npm run build frontend a échoué." }

Ok "Frontend installé et buildé."

Step "Installation et build du backend"

Set-Location $ServerDir
npm install
if ($LASTEXITCODE -ne 0) { Fail "npm install backend a échoué." }

npm run build
if ($LASTEXITCODE -ne 0) { Fail "npm run build backend a échoué." }

Ok "Backend installé et buildé."

# ------------------------------------------------------------
# START SCRIPT
# ------------------------------------------------------------
Step "Création du script de lancement"

$StartBat = Join-Path $AppDir "start.bat"

@"
@echo off
title Weight Stream
cd /d "%~dp0"

echo ============================================
echo   Weight Stream - Lancement
echo ============================================
echo.

echo Demarrage du backend sur $BackendPort...
start "Weight Stream Backend" cmd /k "cd /d ""%~dp0server"" && node dist\index.js"

echo Demarrage du frontend sur $FrontendPort...
start "Weight Stream Frontend" cmd /k "cd /d ""%~dp0"" && npx --yes serve -s dist -l $FrontendPort"

echo.
echo Application disponible sur :
echo   http://localhost:$FrontendPort
echo.
pause
"@ | Set-Content -Path $StartBat -Encoding ASCII

Ok "Script start.bat créé."

# ------------------------------------------------------------
# DONE
# ------------------------------------------------------------
Step "Installation terminée"

Write-Host ""
Write-Host "Répertoire : $AppDir" -ForegroundColor Yellow
Write-Host "Frontend   : http://localhost:$FrontendPort" -ForegroundColor Yellow
Write-Host "Backend    : http://localhost:$BackendPort" -ForegroundColor Yellow
Write-Host "MySQL root : $RootPass" -ForegroundColor Yellow
Write-Host "Lancement  : $StartBat" -ForegroundColor Yellow
Write-Host ""
