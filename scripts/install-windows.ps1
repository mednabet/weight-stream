# ============================================
# INSTALLATION WEIGHT STREAM (VERSION SIMPLE)
# ============================================

$ErrorActionPreference = "Stop"

# CONFIG
$AppDir = "C:\WeightStream\weight-stream"
$RepoUrl = "https://github.com/mednabet/weight-stream.git"
$DbName = "production_manager"
$DbUser = "prod_app"
$RootPass = "toor"

# ============================================
function step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function ok($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function err($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red; exit 1 }

# ============================================
# 1. CLONE
# ============================================
step "Clonage du projet"

if (Test-Path $AppDir) {
    Remove-Item $AppDir -Recurse -Force
}

git clone $RepoUrl $AppDir
ok "Projet cloné"

# ============================================
# 2. MYSQL
# ============================================
step "Configuration MySQL"

$tmp = "$env:TEMP\mysql.cnf"

@"
[client]
user=root
password="$RootPass"
"@ | Out-File -Encoding ASCII $tmp

$sql = @"
CREATE DATABASE IF NOT EXISTS $DbName CHARACTER SET utf8mb4;
CREATE USER IF NOT EXISTS '$DbUser'@'localhost' IDENTIFIED BY '$(Get-Random)';
GRANT ALL PRIVILEGES ON $DbName.* TO '$DbUser'@'localhost';
FLUSH PRIVILEGES;
"@

$sqlFile = "$env:TEMP\db.sql"
$sql | Out-File $sqlFile

# Test connexion
mysql "--defaults-extra-file=$tmp" -e "SELECT 1;" 2>$null
if ($LASTEXITCODE -ne 0) { err "Connexion MySQL échouée" }

# Import SQL
Get-Content $sqlFile | mysql "--defaults-extra-file=$tmp"
if ($LASTEXITCODE -ne 0) { err "Création DB échouée" }

ok "MySQL OK"

Remove-Item $tmp, $sqlFile -Force

# ============================================
# 3. ENV
# ============================================
step "Configuration .env"

$DbPass = "app123"

@"
DB_HOST=localhost
DB_PORT=3306
DB_NAME=$DbName
DB_USER=$DbUser
DB_PASSWORD=$DbPass

PORT=3001
NODE_ENV=production
CORS_ORIGIN=http://localhost:8080

JWT_SECRET=$(Get-Random)
"@ | Out-File "$AppDir\server\.env"

ok ".env créé"

# ============================================
# 4. INSTALL + BUILD
# ============================================
step "Installation Node"

cd $AppDir
npm install
npm run build

cd "$AppDir\server"
npm install
npm run build

ok "Build terminé"

# ============================================
# 5. START SCRIPT
# ============================================
step "Création start.bat"

@"
@echo off
cd /d "%~dp0"

start "Backend" cmd /k "cd server && node dist/index.js"
start "Frontend" cmd /k "npx --yes serve -s dist -l 8080"

echo Application: http://localhost:8080
pause
"@ | Out-File "$AppDir\start.bat" -Encoding ASCII

ok "Script de lancement créé"

# ============================================
step "INSTALLATION TERMINÉE"

Write-Host "Lancer avec : $AppDir\start.bat" -ForegroundColor Yellow
