<#
.SYNOPSIS
    Script d installation Weight Stream pour Windows
    Auteur: NETPROCESS (https://netprocess.ma)
    Developpeur: Mohammed NABET (+212 661 550 618)
    Version: 5.0.0

.DESCRIPTION
    Ce script installe et configure Weight Stream sur un environnement Windows.
    Architecture single-port : le backend Express sert aussi le frontend (pas besoin de serve).
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
Write-Host "  Weight Stream v5.0.0 - Installation Windows"               -ForegroundColor Cyan
Write-Host "  Auteur : NETPROCESS (https://netprocess.ma)"               -ForegroundColor Cyan
Write-Host "  Dev    : Mohammed NABET (+212 661 550 618)"                 -ForegroundColor Cyan
Write-Host "  Architecture : Single-port (Express sert le frontend)"     -ForegroundColor Cyan
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
$AppPort = 3001
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
        # Se deplacer hors du dossier avant de le supprimer
        Set-Location $env:USERPROFILE
        Write-Info "Suppression..."
        # Arreter les processus node qui pourraient verrouiller le dossier
        Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        try {
            Remove-Item -Path $AppDirFull -Recurse -Force
        } catch {
            Write-Warn "Premiere tentative echouee, nouvel essai dans 5 secondes..."
            Start-Sleep -Seconds 5
            Remove-Item -Path $AppDirFull -Recurse -Force
        }
        Write-OK "Ancien dossier supprime."
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

# En mode single-port, pas besoin de CORS_ORIGIN car frontend et backend sont sur le meme port
$envLines = @()
$envLines += "# Base de donnees MySQL"
$envLines += "DB_HOST=localhost"
$envLines += "DB_PORT=3306"
$envLines += ("DB_NAME=" + $DbName)
$envLines += ("DB_USER=" + $DbUser)
$envLines += ("DB_PASSWORD=" + $DbPass)
$envLines += ""
$envLines += "# Serveur"
$envLines += ("PORT=" + $AppPort)
$envLines += "NODE_ENV=production"
$envLines += "# CORS_ORIGIN non necessaire : frontend servi par le meme serveur Express"
$envLines += ""
$envLines += "# Securite"
$envLines += ("JWT_SECRET=" + $JwtSecret)

$envPath = Join-Path $ServerDir ".env"
[System.IO.File]::WriteAllLines($envPath, $envLines, [System.Text.Encoding]::UTF8)
Write-OK ("Fichier .env genere dans " + $envPath)

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
# ETAPE 7 - Scripts de lancement (architecture single-port)
# ================================================================
Write-Step "ETAPE 7 - Creation des scripts de lancement"

# --- start.bat (production - un seul processus) ---
$startLines = @()
$startLines += "@echo off"
$startLines += "title Weight Stream"
$startLines += "cd /d `"%~dp0`""
$startLines += "echo ============================================================"
$startLines += "echo   Weight Stream - Lancement Production"
$startLines += "echo   Auteur: NETPROCESS (https://netprocess.ma)"
$startLines += "echo   Architecture: Single-port (Express sert le frontend)"
$startLines += "echo ============================================================"
$startLines += "echo."
$startLines += "if not exist `"server\dist\index.js`" ("
$startLines += "    echo [ERREUR] Build backend introuvable. Lancez le build d abord."
$startLines += "    pause"
$startLines += "    exit /b 1"
$startLines += ")"
$startLines += "if not exist `"dist\index.html`" ("
$startLines += "    echo [ERREUR] Build frontend introuvable. Lancez le build d abord."
$startLines += "    pause"
$startLines += "    exit /b 1"
$startLines += ")"
$startLines += ("echo [INFO] Demarrage de Weight Stream sur le port " + $AppPort + "...")
$startLines += "echo [INFO] Le backend Express sert aussi le frontend (single-port)."
$startLines += "echo."
$startLines += ("echo   Application : http://localhost:" + $AppPort)
$startLines += ("echo   API Health  : http://localhost:" + $AppPort + "/api/health")
$startLines += "echo."
$startLines += "cd /d `"%~dp0server`""
$startLines += "node dist\index.js"
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
$devLines += ("echo [INFO] Backend dev sur port " + $AppPort + "...")
$devLines += "start `"WeightStream-Backend-Dev`" cmd /k `"cd /d `"`"%~dp0server`"`" && npm run dev`""
$devLines += "timeout /t 3 /nobreak >nul"
$devLines += "echo [INFO] Frontend dev sur port 5173..."
$devLines += "start `"WeightStream-Frontend-Dev`" cmd /k `"cd /d `"`"%~dp0`"`" && npm run dev`""
$devLines += "echo."
$devLines += "echo   Frontend : http://localhost:5173"
$devLines += ("echo   Backend  : http://localhost:" + $AppPort)
$devLines += "echo."
$devLines += "pause"

$devBatPath = Join-Path $AppDirFull "start-dev.bat"
[System.IO.File]::WriteAllLines($devBatPath, $devLines, [System.Text.Encoding]::ASCII)

# --- stop.bat ---
$stopLines = @()
$stopLines += "@echo off"
$stopLines += "echo [INFO] Arret des services Weight Stream..."
$stopLines += "taskkill /FI `"WINDOWTITLE eq WeightStream*`" /F >nul 2>nul"
$stopLines += "echo [OK] Services arretes."
$stopLines += "pause"

$stopBatPath = Join-Path $AppDirFull "stop.bat"
[System.IO.File]::WriteAllLines($stopBatPath, $stopLines, [System.Text.Encoding]::ASCII)

# --- start-background.bat (lancement silencieux pour demarrage auto - UN SEUL processus) ---
$bgLines = @()
$bgLines += "@echo off"
$bgLines += "cd /d `"%~dp0`""
$bgLines += "if not exist `"server\dist\index.js`" exit /b 1"
$bgLines += "if not exist `"dist\index.html`" exit /b 1"
$bgLines += "cd /d `"%~dp0server`""
$bgLines += "start /min `"WeightStream`" cmd /c `"node dist\index.js`""

$bgBatPath = Join-Path $AppDirFull "start-background.bat"
[System.IO.File]::WriteAllLines($bgBatPath, $bgLines, [System.Text.Encoding]::ASCII)

Write-OK "start.bat            - Production (interactif, single-port)"
Write-OK "start-background.bat - Production (silencieux, demarrage auto)"
Write-OK "start-dev.bat        - Developpement (2 processus)"
Write-OK "stop.bat             - Arret"

# ================================================================
# ETAPE 8 - Demarrage automatique avec Windows
# ================================================================
Write-Step "ETAPE 8 - Demarrage automatique avec Windows"

$taskName = "WeightStream-AutoStart"

# Supprimer l ancienne tache si elle existe
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Info "Ancienne tache planifiee supprimee."
}

# Creer la tache planifiee au demarrage de Windows
$action = New-ScheduledTaskAction -Execute $bgBatPath -WorkingDirectory $AppDirFull
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero)
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "Demarrage automatique de Weight Stream (single-port Express) - NETPROCESS" | Out-Null

if ($?) {
    Write-OK ("Tache planifiee '" + $taskName + "' creee avec succes.")
    Write-OK "Weight Stream demarrera automatiquement au prochain redemarrage de Windows."
} else {
    Write-Warn "Impossible de creer la tache planifiee."
    Write-Host "  Vous pouvez l ajouter manuellement :" -ForegroundColor Yellow
    Write-Host ("  1. Ouvrir le Planificateur de taches") -ForegroundColor Yellow
    Write-Host ("  2. Creer une tache avec le declencheur 'Au demarrage'") -ForegroundColor Yellow
    Write-Host ("  3. Action : Executer " + $bgBatPath) -ForegroundColor Yellow
}

# ================================================================
# Resume final
# ================================================================
Set-Location $AppDirFull

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Installation terminee avec succes !"                        -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Application  : Weight Stream v5.0.0"                        -ForegroundColor Cyan
Write-Host "  Auteur       : NETPROCESS (https://netprocess.ma)"          -ForegroundColor Cyan
Write-Host "  Dev          : Mohammed NABET (+212 661 550 618)"           -ForegroundColor Cyan
Write-Host ("  Repertoire   : " + $AppDirFull)                            -ForegroundColor Cyan
Write-Host "  Architecture : Single-port (Express sert le frontend)"      -ForegroundColor Cyan
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
Write-Host ("    Silencieux    : " + $bgBatPath)
Write-Host ("    Developpement : " + $devBatPath)
Write-Host ("    Arret         : " + $stopBatPath)
Write-Host ""
Write-Host "  Demarrage automatique :" -ForegroundColor Yellow
Write-Host ("    Tache planifiee : " + $taskName)
Write-Host "    Statut          : Actif (au demarrage de Windows)"
Write-Host ""
Write-Host ("  Acces : http://" + $ServerName + ":" + $AppPort) -ForegroundColor Green
Write-Host "  Compte admin par defaut : m.nabet@netprocess.ma / netprocess" -ForegroundColor Green
Write-Host ""
Write-Host "  NOTE : Un seul port (" + $AppPort + ") pour tout !" -ForegroundColor Yellow
Write-Host "  Le backend Express sert aussi les fichiers du frontend." -ForegroundColor Yellow
Write-Host "  Plus besoin de 'serve' ni de double port." -ForegroundColor Yellow
Write-Host ""
