<#
.SYNOPSIS
    Script d installation Weight Stream pour Windows
    Auteur: NETPROCESS (https://netprocess.ma)
    Developpeur: Mohammed NABET (+212 661 550 618)
    Version: 4.2.0

.DESCRIPTION
    Ce script installe et configure Weight Stream sur un environnement Windows.
    Prerequis manuels : Node.js 22.x, Git, MySQL 8.0+

.PARAMETER AppDir
    Repertoire d installation. Par defaut : C:\WeightStream

.PARAMETER ServerName
    Nom de domaine ou adresse IP. Par defaut : localhost

.PARAMETER SkipBuild
    Ignorer le build de production

.EXAMPLE
    .\install-windows.ps1
    .\install-windows.ps1 -AppDir "D:\Apps\WeightStream" -ServerName "192.168.1.100"
#>

param(
    [string]$AppDir = "C:\WeightStream",
    [string]$ServerName = "localhost",
    [switch]$SkipBuild = $false
)

# --- Verification admin ---
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Warning "Ce script doit etre execute en tant qu Administrateur."
    Write-Host "Clic droit sur PowerShell puis Executer en tant qu administrateur" -ForegroundColor Yellow
    Read-Host "Appuyez sur Entree pour quitter"
    Exit 1
}

$ErrorActionPreference = "Stop"

# --- Fonctions utilitaires ---
function Write-Step  { param([string]$m) Write-Host ("`n=== " + $m + " ===") -ForegroundColor Cyan }
function Write-OK    { param([string]$m) Write-Host ("[OK]   " + $m) -ForegroundColor Green }
function Write-Warn  { param([string]$m) Write-Host ("[WARN] " + $m) -ForegroundColor Yellow }
function Write-Err   { param([string]$m) Write-Host ("[ERR]  " + $m) -ForegroundColor Red }
function Write-Info  { param([string]$m) Write-Host ("[INFO] " + $m) -ForegroundColor White }

function Fail {
    param([string]$m)
    Write-Host ("[ECHEC] " + $m) -ForegroundColor Red
    Read-Host "Appuyez sur Entree pour quitter"
    Exit 1
}

function Get-RandomPassword {
    param([int]$Length = 24)
    $chars = (48..57) + (65..90) + (97..122)
    return -join ($chars | Get-Random -Count $Length | ForEach-Object { [char]$_ })
}

function Test-Cmd {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

# --- Banniere ---
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Weight Stream v4.2.0 - Installation Windows"               -ForegroundColor Cyan
Write-Host "  Auteur : NETPROCESS (https://netprocess.ma)"               -ForegroundColor Cyan
Write-Host "  Dev    : Mohammed NABET (+212 661 550 618)"                 -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host ("  Repertoire : " + $AppDir)
Write-Host ("  Serveur    : " + $ServerName)
Write-Host ""

# ================================================================
# ETAPE 1 - Verification des prerequis
# ================================================================
Write-Step "ETAPE 1 - Verification des prerequis"

if (-not (Test-Cmd "node")) {
    Fail "Node.js absent. Telechargez-le sur https://nodejs.org/"
}
$nodeVer = & node -v 2>&1
Write-OK ("Node.js : " + $nodeVer)

if (-not (Test-Cmd "npm")) {
    Fail "npm absent. Reinstallez Node.js."
}
$npmVer = & npm -v 2>&1
Write-OK ("npm : " + $npmVer)

if (-not (Test-Cmd "git")) {
    Fail "Git absent. Telechargez-le sur https://git-scm.com/"
}
$gitVer = & git --version 2>&1
Write-OK ("Git : " + $gitVer)

$mysqlAvailable = Test-Cmd "mysql"
if (-not $mysqlAvailable) {
    Write-Warn "mysql.exe absent du PATH."
    Write-Host "  Installez MySQL 8.0+ : https://dev.mysql.com/downloads/installer/" -ForegroundColor Yellow
    $rep = Read-Host "Continuer sans MySQL automatique ? (O/N)"
    if ($rep -notmatch "^[OoYy]") { Exit 1 }
} else {
    $mysqlVer = & mysql -V 2>&1
    Write-OK ("MySQL : " + $mysqlVer)
}

# ================================================================
# ETAPE 2 - Configuration MySQL
# ================================================================
$DbName = "production_manager"
$DbUser = "prod_app"
$DbPass = Get-RandomPassword -Length 24
$FrontendPort = 8080
$BackendPort  = 3001
$DbConfigured = $false

if ($mysqlAvailable) {
    Write-Step "ETAPE 2 - Configuration MySQL"
    Write-Host "Entrez le mot de passe root MySQL." -ForegroundColor Yellow
    Write-Host "Laissez vide si root n a pas de mot de passe." -ForegroundColor Yellow

    $secureRootPass = Read-Host -AsSecureString "Mot de passe root MySQL"
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureRootPass)
    $rootPassPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

    # Creer fichier config MySQL temporaire (evite mdp en CLI)
    $tmpCnf = Join-Path $env:TEMP ("ws_cnf_" + [System.Guid]::NewGuid().ToString("N") + ".cnf")
    $sqlFile = Join-Path $env:TEMP ("ws_sql_" + [System.Guid]::NewGuid().ToString("N") + ".sql")

    # Ecrire le fichier cnf avec concat de lignes
    $cnfLines = @()
    $cnfLines += "[client]"
    $cnfLines += "user=root"
    $cnfLines += ("password=" + $rootPassPlain)
    [System.IO.File]::WriteAllLines($tmpCnf, $cnfLines, [System.Text.Encoding]::ASCII)

    # Ecrire le fichier SQL avec concat de lignes
    $sqlLines = @()
    $sqlLines += ("CREATE DATABASE IF NOT EXISTS " + $DbName + " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
    $sqlLines += ("CREATE USER IF NOT EXISTS '" + $DbUser + "'@'localhost' IDENTIFIED BY '" + $DbPass + "';")
    $sqlLines += ("ALTER USER '" + $DbUser + "'@'localhost' IDENTIFIED BY '" + $DbPass + "';")
    $sqlLines += ("GRANT ALL PRIVILEGES ON " + $DbName + ".* TO '" + $DbUser + "'@'localhost';")
    $sqlLines += "FLUSH PRIVILEGES;"
    [System.IO.File]::WriteAllLines($sqlFile, $sqlLines, [System.Text.Encoding]::UTF8)

    # Convertir les chemins en forward slashes pour MySQL
    $tmpCnfMySQL = $tmpCnf.Replace("\", "/")
    $sqlFileMySQL = $sqlFile.Replace("\", "/")
    $cnfArg = "--defaults-extra-file=" + $tmpCnfMySQL

    # Tester la connexion root
    & mysql $cnfArg -e "SELECT 1;" 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Remove-Item -Path $tmpCnf -Force -ErrorAction SilentlyContinue
        Remove-Item -Path $sqlFile -Force -ErrorAction SilentlyContinue
        $rootPassPlain = $null
        Fail "Connexion MySQL root echouee. Verifiez le mot de passe."
    }
    Write-OK "Connexion MySQL root validee."

    # Executer le script SQL via redirection stdin
    Get-Content -Path $sqlFile -Raw | & mysql $cnfArg 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Remove-Item -Path $tmpCnf -Force -ErrorAction SilentlyContinue
        Remove-Item -Path $sqlFile -Force -ErrorAction SilentlyContinue
        $rootPassPlain = $null
        Fail "Creation de la base MySQL echouee."
    }

    Remove-Item -Path $tmpCnf -Force -ErrorAction SilentlyContinue
    Remove-Item -Path $sqlFile -Force -ErrorAction SilentlyContinue
    $rootPassPlain = $null
    Write-OK ("Base " + $DbName + " et utilisateur " + $DbUser + " crees.")
    $DbConfigured = $true
} else {
    Write-Warn "Configuration MySQL ignoree."
    Write-Host "  Creez manuellement la base avec :" -ForegroundColor Yellow
    Write-Host ("    CREATE DATABASE " + $DbName + " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;") -ForegroundColor Gray
    Write-Host ("    CREATE USER '" + $DbUser + "'@'localhost' IDENTIFIED BY 'votre_mot_de_passe';") -ForegroundColor Gray
    Write-Host ("    GRANT ALL PRIVILEGES ON " + $DbName + ".* TO '" + $DbUser + "'@'localhost';") -ForegroundColor Gray
    Write-Host "    FLUSH PRIVILEGES;" -ForegroundColor Gray
}

# ================================================================
# ETAPE 3 - Clonage du depot
# ================================================================
Write-Step "ETAPE 3 - Clonage du depot GitHub"

$RepoUrl = "https://github.com/mednabet/weight-stream.git"
$AppDirFull = Join-Path $AppDir "weight-stream"

if (Test-Path $AppDirFull) {
    Write-Warn ("Le dossier " + $AppDirFull + " existe deja.")
    $rep = Read-Host "Supprimer et reinstaller ? (O/N)"
    if ($rep -match "^[OoYy]") {
        Write-Info "Suppression..."
        Remove-Item -Path $AppDirFull -Recurse -Force
    } else {
        Fail "Installation annulee."
    }
}

if (-not (Test-Path $AppDir)) {
    New-Item -Path $AppDir -ItemType Directory -Force | Out-Null
}

Write-Info ("Clonage depuis " + $RepoUrl + "...")
& git clone $RepoUrl $AppDirFull
if ($LASTEXITCODE -ne 0) {
    Fail "Echec du clonage. Verifiez votre connexion internet."
}
Write-OK ("Depot clone dans " + $AppDirFull)

# ================================================================
# ETAPE 4 - Fichier .env
# ================================================================
Write-Step "ETAPE 4 - Configuration de l environnement"

$ServerDir = Join-Path $AppDirFull "server"
if (-not (Test-Path $ServerDir)) {
    Fail ("Dossier server introuvable dans " + $AppDirFull)
}

$JwtSecret = Get-RandomPassword -Length 64

if ($ServerName -eq "localhost") {
    $corsOrigin = "http://localhost:" + $FrontendPort
} else {
    $corsOrigin = "http://" + $ServerName
}

$envLines = @()
$envLines += "# Base de donnees MySQL"
$envLines += "DB_HOST=localhost"
$envLines += "DB_PORT=3306"
$envLines += ("DB_NAME=" + $DbName)
$envLines += ("DB_USER=" + $DbUser)
$envLines += ("DB_PASSWORD=" + $DbPass)
$envLines += ""
$envLines += "# Serveur"
$envLines += ("PORT=" + $BackendPort)
$envLines += "NODE_ENV=production"
$envLines += ("CORS_ORIGIN=" + $corsOrigin)
$envLines += ""
$envLines += "# Securite"
$envLines += ("JWT_SECRET=" + $JwtSecret)

$envPath = Join-Path $ServerDir ".env"
[System.IO.File]::WriteAllLines($envPath, $envLines, [System.Text.Encoding]::UTF8)
Write-OK ("Fichier .env genere : " + $envPath)

# ================================================================
# ETAPE 5 - Installation des dependances
# ================================================================
Write-Step "ETAPE 5 - Installation des dependances"

Write-Info "Dependances Frontend..."
Set-Location $AppDirFull
& npm install
if ($LASTEXITCODE -ne 0) { Fail "npm install frontend echoue." }
Write-OK "Frontend installe."

Write-Info "Dependances Backend..."
Set-Location $ServerDir
& npm install
if ($LASTEXITCODE -ne 0) { Fail "npm install backend echoue." }
Write-OK "Backend installe."

# ================================================================
# ETAPE 6 - Build de production
# ================================================================
if (-not $SkipBuild) {
    Write-Step "ETAPE 6 - Build de production"

    Write-Info "Build Frontend React..."
    Set-Location $AppDirFull
    & npm run build
    if ($LASTEXITCODE -ne 0) { Fail "Build frontend echoue." }
    Write-OK ("Frontend compile : " + $AppDirFull + "\dist")

    Write-Info "Build Backend Node.js..."
    Set-Location $ServerDir
    & npm run build
    if ($LASTEXITCODE -ne 0) { Fail "Build backend echoue." }
    Write-OK ("Backend compile : " + $ServerDir + "\dist")
} else {
    Write-Warn "Build ignore (mode -SkipBuild)."
}

# ================================================================
# ETAPE 7 - Installation de serve
# ================================================================
Write-Step "ETAPE 7 - Serveur de fichiers statiques"
Write-Info "Installation de serve..."
& npm install -g serve 2>&1 | Out-Null
Write-OK "serve installe."

# ================================================================
# ETAPE 8 - Scripts de lancement
# ================================================================
Write-Step "ETAPE 8 - Creation des scripts de lancement"

# --- start.bat ---
$startLines = @()
$startLines += "@echo off"
$startLines += "title Weight Stream"
$startLines += "cd /d `"%~dp0`""
$startLines += "echo ============================================================"
$startLines += "echo   Weight Stream - Lancement Production"
$startLines += "echo   Auteur: NETPROCESS (https://netprocess.ma)"
$startLines += "echo ============================================================"
$startLines += "echo."
$startLines += "if not exist `"server\dist\index.js`" ("
$startLines += "    echo [ERREUR] Build backend introuvable."
$startLines += "    pause"
$startLines += "    exit /b 1"
$startLines += ")"
$startLines += "if not exist `"dist\index.html`" ("
$startLines += "    echo [ERREUR] Build frontend introuvable."
$startLines += "    pause"
$startLines += "    exit /b 1"
$startLines += ")"
$startLines += ("echo [INFO] Demarrage du Backend sur le port " + $BackendPort + "...")
$startLines += "start `"WeightStream-Backend`" cmd /k `"cd /d `"`"%~dp0server`"`" && node dist\index.js`""
$startLines += "timeout /t 3 /nobreak >nul"
$startLines += ("echo [INFO] Demarrage du Frontend sur le port " + $FrontendPort + "...")
$startLines += ("start `"WeightStream-Frontend`" cmd /k `"cd /d `"`"%~dp0`"`" && npx --yes serve -s dist -l " + $FrontendPort + "`"")
$startLines += "echo."
$startLines += ("echo   Application disponible sur : http://localhost:" + $FrontendPort)
$startLines += "echo."
$startLines += "pause"

$startBatPath = Join-Path $AppDirFull "start.bat"
[System.IO.File]::WriteAllLines($startBatPath, $startLines, [System.Text.Encoding]::ASCII)

# --- start-dev.bat ---
$devLines = @()
$devLines += "@echo off"
$devLines += "title Weight Stream DEV"
$devLines += "cd /d `"%~dp0`""
$devLines += "echo ============================================================"
$devLines += "echo   Weight Stream - Mode Developpement"
$devLines += "echo ============================================================"
$devLines += "echo."
$devLines += ("echo [INFO] Backend dev sur port " + $BackendPort + "...")
$devLines += "start `"WeightStream-Backend-Dev`" cmd /k `"cd /d `"`"%~dp0server`"`" && npm run dev`""
$devLines += "timeout /t 3 /nobreak >nul"
$devLines += ("echo [INFO] Frontend dev sur port " + $FrontendPort + "...")
$devLines += "start `"WeightStream-Frontend-Dev`" cmd /k `"cd /d `"`"%~dp0`"`" && npm run dev`""
$devLines += "echo."
$devLines += ("echo   Frontend : http://localhost:" + $FrontendPort)
$devLines += ("echo   Backend  : http://localhost:" + $BackendPort)
$devLines += "echo."
$devLines += "pause"

$devBatPath = Join-Path $AppDirFull "start-dev.bat"
[System.IO.File]::WriteAllLines($devBatPath, $devLines, [System.Text.Encoding]::ASCII)

# --- stop.bat ---
$stopLines = @()
$stopLines += "@echo off"
$stopLines += "echo [INFO] Arret des services Weight Stream..."
$stopLines += "taskkill /FI `"WINDOWTITLE eq WeightStream-Backend*`" /F >nul 2>nul"
$stopLines += "taskkill /FI `"WINDOWTITLE eq WeightStream-Frontend*`" /F >nul 2>nul"
$stopLines += "echo [OK] Services arretes."
$stopLines += "pause"

$stopBatPath = Join-Path $AppDirFull "stop.bat"
[System.IO.File]::WriteAllLines($stopBatPath, $stopLines, [System.Text.Encoding]::ASCII)

Write-OK "start.bat     - Production"
Write-OK "start-dev.bat - Developpement"
Write-OK "stop.bat      - Arret"

# ================================================================
# Resume final
# ================================================================
Set-Location $AppDirFull

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Installation terminee avec succes !"                        -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Application  : Weight Stream v4.2.0"                        -ForegroundColor Cyan
Write-Host "  Auteur       : NETPROCESS (https://netprocess.ma)"          -ForegroundColor Cyan
Write-Host ("  Repertoire   : " + $AppDirFull)                            -ForegroundColor Cyan
Write-Host ""
Write-Host "  Base de donnees MySQL :" -ForegroundColor Yellow
Write-Host ("    Base : " + $DbName)
Write-Host ("    User : " + $DbUser)
Write-Host ("    Pass : sauvegarde dans " + $envPath)
if (-not $DbConfigured) {
    Write-Host ""
    Write-Warn "La base n a pas ete configuree automatiquement."
    Write-Host ("  Mettez a jour le mot de passe dans : " + $envPath) -ForegroundColor Yellow
}
Write-Host ""
Write-Host "  Scripts de lancement :" -ForegroundColor Yellow
Write-Host ("    Production    : " + $startBatPath)
Write-Host ("    Developpement : " + $devBatPath)
Write-Host ("    Arret         : " + $stopBatPath)
Write-Host ""
Write-Host ("  Acces : http://" + $ServerName + ":" + $FrontendPort) -ForegroundColor Green
Write-Host "  Le premier utilisateur inscrit deviendra administrateur." -ForegroundColor Green
Write-Host ""
