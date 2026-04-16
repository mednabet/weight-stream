<#
.SYNOPSIS
Script d'installation Weight Stream pour Windows

.AUTEUR
NETPROCESS (https://netprocess.ma)
Développeur: Mohammed NABET (+212 661 550 618)

.VERSION
4.0.1

.DESCRIPTION
Ce script installe et configure Weight Stream sur un environnement Windows.
Il vérifie les prérequis (Node.js, Git, MySQL), clone le dépôt, installe les dépendances,
configure les variables d'environnement et prépare l'application pour le lancement.

.NOTES
L'exécution de ce script nécessite des privilèges d'administrateur.
À lancer dans PowerShell en administrateur :
Set-ExecutionPolicy Bypass -Scope Process -Force
.\scripts\install-windows.ps1
#>

# Forcer l'exécution en tant qu'administrateur
if (
    -not (
        [Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()
    ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
) {
    Write-Warning "Ce script doit être exécuté en tant qu'Administrateur."
    Write-Host "Veuillez relancer PowerShell en tant qu'Administrateur et réexécuter le script."
    exit 1
}

$ErrorActionPreference = "Stop"

# Couleurs
$ColorInfo = "Cyan"
$ColorSuccess = "Green"
$ColorWarning = "Yellow"
$ColorError = "Red"

function Print-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "=== $Message ===" -ForegroundColor $ColorInfo
}

function Print-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor $ColorSuccess
}

function Print-Warning {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor $ColorWarning
}

function Print-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $ColorError
}

function Test-Command {
    param([Parameter(Mandatory = $true)][string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function New-RandomPassword {
    param([int]$Length = 16)

    $chars = @()
    $chars += [char[]]"abcdefghijklmnopqrstuvwxyz"
    $chars += [char[]]"ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    $chars += [char[]]"0123456789"

    return -join (1..$Length | ForEach-Object { $chars | Get-Random })
}

function Invoke-ExternalCommand {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [string]$StdInFile = $null
    )

    if ([string]::IsNullOrWhiteSpace($FilePath)) {
        throw "ERREUR : FilePath vide"
    }

    # 🔥 Détection correcte commande ou chemin
    if (-not (Test-Path $FilePath)) {
        $cmd = Get-Command $FilePath -ErrorAction SilentlyContinue
        if (-not $cmd) {
            throw "ERREUR : Commande introuvable -> $FilePath"
        }
        $FilePath = $cmd.Source
    }

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $FilePath
    $psi.Arguments = ($Arguments -join " ")
    $psi.UseShellExecute = $false
    $psi.RedirectStandardError = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardInput = ($null -ne $StdInFile)
    $psi.CreateNoWindow = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $psi

    [void]$process.Start()

    if ($null -ne $StdInFile) {
        $content = Get-Content -Path $StdInFile -Raw
        $process.StandardInput.Write($content)
        $process.StandardInput.Close()
    }

    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()

    $process.WaitForExit()

    return [PSCustomObject]@{
        ExitCode = $process.ExitCode
        StdOut   = $stdout
        StdErr   = $stderr
    }
}

# Variables
$InstallRoot = "C:\WeightStream"
$AppDir = Join-Path $InstallRoot "weight-stream"
$RepoUrl = "https://github.com/mednabet/weight-stream.git"
$DbName = "production_manager"
$DbUser = "prod_app"

Print-Step "Vérification des prérequis"

# Vérifier Node.js
if (-not (Test-Command "node")) {
    Print-Error "Node.js n'est pas installé ou n'est pas dans le PATH. Veuillez l'installer depuis https://nodejs.org/ (version 22.x recommandée)."
    exit 1
}
try {
    $NodeVersion = & node -v
    Print-Success "Node.js est installé ($NodeVersion)"
} catch {
    Print-Error "Impossible d'exécuter Node.js."
    exit 1
}

# Vérifier npm
if (-not (Test-Command "npm")) {
    Print-Error "npm n'est pas installé ou n'est pas dans le PATH."
    exit 1
}
try {
    $NpmVersion = & npm -v
    Print-Success "npm est installé ($NpmVersion)"
} catch {
    Print-Error "Impossible d'exécuter npm."
    exit 1
}

# Vérifier Git
if (-not (Test-Command "git")) {
    Print-Error "Git n'est pas installé ou n'est pas dans le PATH. Veuillez l'installer depuis https://git-scm.com/"
    exit 1
}
try {
    $GitVersion = & git --version
    Print-Success "Git est installé ($GitVersion)"
} catch {
    Print-Error "Impossible d'exécuter Git."
    exit 1
}

Print-Step "Détection du client MySQL"

$mysqlCmd = Get-Command mysql -ErrorAction SilentlyContinue

$mysql = $null

if ($mysqlCmd -and $mysqlCmd.Source) {
    $mysql = $mysqlCmd.Source
} else {
    $possiblePaths = @(
        "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 9.6\bin\mysql.exe"
    )

    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $mysql = $path
            break
        }
    }
}

if ([string]::IsNullOrWhiteSpace($mysql)) {
    Print-Error "mysql.exe introuvable. Vérifiez l'installation ou le PATH."
    exit 1
}

# ⚠️ IMPORTANT : forcer string propre
$mysql = $mysql.ToString().Trim()

Print-Success "MySQL client détecté : $mysql"

Print-Step "Déploiement de l'application"

if (-not (Test-Path $InstallRoot)) {
    New-Item -Path $InstallRoot -ItemType Directory -Force | Out-Null
}

if (Test-Path $AppDir) {
    Print-Warning "Le dossier $AppDir existe déjà."
    $overwrite = Read-Host "Voulez-vous le supprimer et recommencer ? (O/N)"
    if ($overwrite -match "^[OoYy]$") {
        Remove-Item -Path $AppDir -Recurse -Force
        Print-Success "Ancien dossier supprimé."
    } else {
        Print-Error "Installation annulée."
        exit 1
    }
}

Write-Host "Clonage du dépôt GitHub..."
$cloneResult = Invoke-ExternalCommand -FilePath "git" -Arguments @(
    "clone",
    $RepoUrl,
    $AppDir
)

if ($cloneResult.ExitCode -ne 0) {
    Print-Error "Échec du clonage du dépôt."
    if (-not [string]::IsNullOrWhiteSpace($cloneResult.StdErr)) {
        Write-Host $cloneResult.StdErr -ForegroundColor $ColorError
    }
    if (-not [string]::IsNullOrWhiteSpace($cloneResult.StdOut)) {
        Write-Host $cloneResult.StdOut -ForegroundColor $ColorError
    }
    exit 1
}

Print-Success "Dépôt cloné avec succès."

# Générer un JWT Secret
$JwtSecret = New-RandomPassword -Length 64

Print-Step "Configuration de l'environnement"

$ServerDir = Join-Path $AppDir "server"
if (-not (Test-Path $ServerDir)) {
    Print-Error "Le dossier backend '$ServerDir' est introuvable après clonage."
    exit 1
}

$EnvContent = @"
# Database MySQL
DB_HOST=localhost
DB_PORT=3306
DB_NAME=$DbName
DB_USER=$DbUser
DB_PASSWORD=$DbPass

# Server
PORT=3001
NODE_ENV=production
CORS_ORIGIN=http://localhost:8080

# Security
JWT_SECRET=$JwtSecret
"@

$EnvFile = Join-Path $ServerDir ".env"
$EnvContent | Out-File -FilePath $EnvFile -Encoding utf8
Print-Success "Fichier .env généré : $EnvFile"

Print-Step "Installation des dépendances et build"

Set-Location $AppDir

Write-Host "Installation des dépendances frontend..."
$frontendInstall = Invoke-ExternalCommand -FilePath "npm.cmd" -Arguments @("install")
if ($frontendInstall.ExitCode -ne 0) {
    Print-Error "Échec de l'installation des dépendances frontend."
    Write-Host $frontendInstall.StdErr -ForegroundColor $ColorError
    Write-Host $frontendInstall.StdOut -ForegroundColor $ColorError
    exit 1
}
Print-Success "Dépendances frontend installées."

Write-Host "Build du frontend..."
$frontendBuild = Invoke-ExternalCommand -FilePath "npm.cmd" -Arguments @("run", "build")
if ($frontendBuild.ExitCode -ne 0) {
    Print-Error "Échec du build frontend."
    Write-Host $frontendBuild.StdErr -ForegroundColor $ColorError
    Write-Host $frontendBuild.StdOut -ForegroundColor $ColorError
    exit 1
}
Print-Success "Build frontend terminé."

Set-Location $ServerDir

Write-Host "Installation des dépendances backend..."
$backendInstall = Invoke-ExternalCommand -FilePath "npm.cmd" -Arguments @("install", "--production=false")
if ($backendInstall.ExitCode -ne 0) {
    Print-Error "Échec de l'installation des dépendances backend."
    Write-Host $backendInstall.StdErr -ForegroundColor $ColorError
    Write-Host $backendInstall.StdOut -ForegroundColor $ColorError
    exit 1
}
Print-Success "Dépendances backend installées."

Write-Host "Build du backend..."
$backendBuild = Invoke-ExternalCommand -FilePath "npm.cmd" -Arguments @("run", "build")
if ($backendBuild.ExitCode -ne 0) {
    Print-Error "Échec du build backend."
    Write-Host $backendBuild.StdErr -ForegroundColor $ColorError
    Write-Host $backendBuild.StdOut -ForegroundColor $ColorError
    exit 1
}
Print-Success "Build backend terminé."

Print-Step "Création des scripts de lancement"

$StartScript = @"
@echo off
echo ============================================
echo   Weight Stream - Lancement
echo   Auteur: NETPROCESS (https://netprocess.ma)
echo ============================================

cd /d "%~dp0"

echo Demarrage du Backend (Port 3001)...
start "Weight Stream Backend" cmd /c "cd /d server && node dist\index.js"

echo Demarrage du Frontend (Port 8080)...
start "Weight Stream Frontend" cmd /c "npx serve -s dist -l 8080"

echo.
echo Application demarree !
echo Acces: http://localhost:8080
echo.
pause
"@

$StartBat = Join-Path $AppDir "start.bat"
$StartScript | Out-File -FilePath $StartBat -Encoding ascii
Print-Success "Script de lancement créé : $StartBat"

Print-Step "Installation terminée"

Write-Host ""
Write-Host "============================================" -ForegroundColor $ColorSuccess
Write-Host "Installation terminée avec succès !" -ForegroundColor $ColorSuccess
Write-Host "============================================" -ForegroundColor $ColorSuccess
Write-Host ""
Write-Host "Application : Weight Stream v4.0.1" -ForegroundColor $ColorInfo
Write-Host "Auteur      : NETPROCESS (https://netprocess.ma)" -ForegroundColor $ColorInfo
Write-Host "Répertoire  : $AppDir" -ForegroundColor $ColorInfo
Write-Host ""
Write-Host "Base de données MySQL :" -ForegroundColor $ColorWarning
Write-Host "  Base : $DbName"
Write-Host "  User : $DbUser"
Write-Host "  Pass : sauvegardé dans $EnvFile"
Write-Host ""
Write-Host "Pour démarrer l'application, exécutez :" -ForegroundColor $ColorInfo
Write-Host "  $StartBat"
Write-Host ""
Write-Host "Le premier utilisateur inscrit deviendra automatiquement administrateur." -ForegroundColor $ColorSuccess
Write-Host ""
