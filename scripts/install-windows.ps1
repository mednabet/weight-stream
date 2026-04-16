<#
.SYNOPSIS
Installateur Windows pour Weight Stream

.DESCRIPTION
- Vérifie Node.js, npm, Git et MySQL
- Utilise le repo courant si le script est lancé depuis weight-stream
- Sinon clone le dépôt GitHub
- Crée la base MySQL et l'utilisateur applicatif
- Génère server\.env
- Installe et build le frontend et le backend
- Crée start.bat pour lancer l'application

.EXAMPLE
PowerShell Administrateur :
Set-ExecutionPolicy Bypass -Scope Process -Force
.\scripts\install-windows.ps1

.EXAMPLE
Forcer le clonage depuis GitHub :
.\scripts\install-windows.ps1 -ForceClone

.EXAMPLE
Installer ailleurs :
.\scripts\install-windows.ps1 -InstallRoot "D:\Apps\WeightStream"
#>

[CmdletBinding()]
param(
    [string]$InstallRoot = "C:\WeightStream",
    [string]$RepoUrl = "https://github.com/mednabet/weight-stream.git",
    [string]$DbName = "production_manager",
    [string]$DbUser = "prod_app",
    [int]$FrontendPort = 8080,
    [int]$BackendPort = 3001,
    [switch]$ForceClone
)

$ErrorActionPreference = "Stop"

# ------------------------------------------------------------
# Admin check
# ------------------------------------------------------------
if (
    -not (
        [Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()
    ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
) {
    Write-Warning "Ce script doit être exécuté en tant qu'Administrateur."
    exit 1
}

# ------------------------------------------------------------
# UI helpers
# ------------------------------------------------------------
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

# ------------------------------------------------------------
# Utilities
# ------------------------------------------------------------
function Resolve-Executable {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,

        [string[]]$FallbackPaths = @()
    )

    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source) {
        return $cmd.Source.ToString().Trim()
    }

    foreach ($path in $FallbackPaths) {
        if (-not [string]::IsNullOrWhiteSpace($path) -and (Test-Path $path)) {
            return (Resolve-Path $path).Path
        }
    }

    return $null
}

function Invoke-ExternalCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,

        [string[]]$Arguments = @(),

        [string]$WorkingDirectory = $null,

        [string]$StdInFile = $null
    )

    if ([string]::IsNullOrWhiteSpace($FilePath)) {
        throw "Le chemin de commande est vide."
    }

    $resolved = $FilePath

    if (-not (Test-Path $resolved)) {
        $cmd = Get-Command $resolved -ErrorAction SilentlyContinue
        if ($cmd -and $cmd.Source) {
            $resolved = $cmd.Source
        } else {
            throw "Commande introuvable : $FilePath"
        }
    }

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $resolved
    $psi.Arguments = ($Arguments -join " ")
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.RedirectStandardInput = ($null -ne $StdInFile)
    $psi.CreateNoWindow = $true

    if (-not [string]::IsNullOrWhiteSpace($WorkingDirectory)) {
        $psi.WorkingDirectory = $WorkingDirectory
    }

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

    [PSCustomObject]@{
        ExitCode = $process.ExitCode
        StdOut   = $stdout
        StdErr   = $stderr
        FilePath = $resolved
    }
}

function Assert-CommandSuccess {
    param(
        [Parameter(Mandatory = $true)]
        $Result,
        [Parameter(Mandatory = $true)]
        [string]$ErrorMessage
    )

    if ($Result.ExitCode -ne 0) {
        Print-Error $ErrorMessage
        if (-not [string]::IsNullOrWhiteSpace($Result.StdErr)) {
            Write-Host $Result.StdErr -ForegroundColor $ColorError
        }
        if (-not [string]::IsNullOrWhiteSpace($Result.StdOut)) {
            Write-Host $Result.StdOut -ForegroundColor $ColorError
        }
        exit 1
    }
}

function New-RandomPassword {
    param([int]$Length = 20)

    $chars = [char[]]"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    return -join (1..$Length | ForEach-Object { $chars | Get-Random })
}

# ------------------------------------------------------------
# Detect current repo or target install folder
# ------------------------------------------------------------
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRootFromScript = Resolve-Path (Join-Path $ScriptDir "..")
$CurrentRepoPackage = Join-Path $RepoRootFromScript "package.json"
$CurrentServerPackage = Join-Path $RepoRootFromScript "server\package.json"

$UseCurrentRepo = $false
if ((Test-Path $CurrentRepoPackage) -and (Test-Path $CurrentServerPackage) -and (-not $ForceClone)) {
    $UseCurrentRepo = $true
}

$TargetAppDir = Join-Path $InstallRoot "weight-stream"

# ------------------------------------------------------------
# Detect executables
# ------------------------------------------------------------
Print-Step "Vérification des prérequis"

$NodeExe = Resolve-Executable -Name "node"
if (-not $NodeExe) {
    Print-Error "Node.js introuvable. Installe Node.js 22.x puis relance."
    exit 1
}
$NodeVersion = (& $NodeExe -v)
Print-Success "Node.js détecté : $NodeVersion"

$NpmExe = Resolve-Executable -Name "npm.cmd" -FallbackPaths @(
    "$env:ProgramFiles\nodejs\npm.cmd",
    "$env:ProgramFiles(x86)\nodejs\npm.cmd"
)
if (-not $NpmExe) {
    Print-Error "npm introuvable."
    exit 1
}
$NpmVersion = (& $NpmExe -v)
Print-Success "npm détecté : $NpmVersion"

$NpxExe = Resolve-Executable -Name "npx.cmd" -FallbackPaths @(
    "$env:ProgramFiles\nodejs\npx.cmd",
    "$env:ProgramFiles(x86)\nodejs\npx.cmd"
)
if (-not $NpxExe) {
    Print-Error "npx introuvable."
    exit 1
}
Print-Success "npx détecté : $NpxExe"

$GitExe = Resolve-Executable -Name "git.exe" -FallbackPaths @(
    "$env:ProgramFiles\Git\cmd\git.exe",
    "$env:ProgramFiles\Git\bin\git.exe",
    "$env:ProgramFiles(x86)\Git\cmd\git.exe",
    "$env:ProgramFiles(x86)\Git\bin\git.exe"
)
if (-not $GitExe) {
    Print-Error "Git introuvable."
    exit 1
}
$GitVersion = (& $GitExe --version)
Print-Success "Git détecté : $GitVersion"

$MysqlExe = Resolve-Executable -Name "mysql.exe" -FallbackPaths @(
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 9.6\bin\mysql.exe"
)
if (-not $MysqlExe) {
    Print-Error "mysql.exe introuvable."
    exit 1
}
$MysqlVersion = (& $MysqlExe --version)
Print-Success "MySQL détecté : $MysqlVersion"

# ------------------------------------------------------------
# Acquire source code
# ------------------------------------------------------------
Print-Step "Préparation du code source"

if ($UseCurrentRepo) {
    $SourceRepoDir = $RepoRootFromScript.Path
    Print-Success "Repo courant détecté : $SourceRepoDir"
} else {
    if (-not (Test-Path $InstallRoot)) {
        New-Item -Path $InstallRoot -ItemType Directory -Force | Out-Null
    }

    if (Test-Path $TargetAppDir) {
        $overwrite = Read-Host "Le dossier $TargetAppDir existe déjà. Le supprimer ? (O/N)"
        if ($overwrite -match "^[OoYy]$") {
            Remove-Item -Path $TargetAppDir -Recurse -Force
        } else {
            Print-Error "Installation annulée."
            exit 1
        }
    }

    Print-Step "Clonage du dépôt GitHub"
    $clone = Invoke-ExternalCommand -FilePath $GitExe -Arguments @(
        "clone",
        $RepoUrl,
        $TargetAppDir
    )
    Assert-CommandSuccess -Result $clone -ErrorMessage "Échec du clonage Git."

    $SourceRepoDir = $TargetAppDir
    Print-Success "Dépôt cloné dans $SourceRepoDir"
}

# Si on installe depuis le repo courant, on déploie dans InstallRoot\weight-stream
if ($UseCurrentRepo) {
    if (-not (Test-Path $InstallRoot)) {
        New-Item -Path $InstallRoot -ItemType Directory -Force | Out-Null
    }

    if (Test-Path $TargetAppDir) {
        $samePath = ((Resolve-Path $TargetAppDir -ErrorAction SilentlyContinue) -and ((Resolve-Path $TargetAppDir).Path -eq (Resolve-Path $SourceRepoDir).Path))
        if (-not $samePath) {
            $overwrite = Read-Host "Le dossier $TargetAppDir existe déjà. Le remplacer ? (O/N)"
            if ($overwrite -match "^[OoYy]$") {
                Remove-Item -Path $TargetAppDir -Recurse -Force
            } else {
                Print-Error "Installation annulée."
                exit 1
            }
        }
    }

    if (-not (Test-Path $TargetAppDir)) {
        Print-Step "Copie du projet vers le dossier d'installation"
        Copy-Item -Path $SourceRepoDir -Destination $TargetAppDir -Recurse -Force
    } elseif ((Resolve-Path $TargetAppDir).Path -eq (Resolve-Path $SourceRepoDir).Path) {
        Print-Success "Le repo courant est déjà le dossier d'installation."
    }
}

$AppDir = $TargetAppDir
$ServerDir = Join-Path $AppDir "server"

if (-not (Test-Path (Join-Path $AppDir "package.json"))) {
    Print-Error "package.json introuvable dans $AppDir"
    exit 1
}
if (-not (Test-Path (Join-Path $ServerDir "package.json"))) {
    Print-Error "server\package.json introuvable dans $ServerDir"
    exit 1
}

# ------------------------------------------------------------
# MySQL setup
# ------------------------------------------------------------
Print-Step "Configuration MySQL"

$MysqlRootPass = Read-Host -AsSecureString "Mot de passe root MySQL"
$BSTR = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($MysqlRootPass)

try {
    $RootPassPlain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($BSTR)
}
finally {
    if ($BSTR -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
    }
}

if ([string]::IsNullOrWhiteSpace($RootPassPlain)) {
    Print-Error "Le mot de passe root MySQL est vide."
    exit 1
}

$DbPass = New-RandomPassword -Length 20

$SqlScript = @"
CREATE DATABASE IF NOT EXISTS $DbName CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DbUser'@'localhost' IDENTIFIED BY '$DbPass';
ALTER USER '$DbUser'@'localhost' IDENTIFIED BY '$DbPass';
GRANT ALL PRIVILEGES ON $DbName.* TO '$DbUser'@'localhost';
FLUSH PRIVILEGES;
"@

$SqlFile = Join-Path $env:TEMP "weight_stream_setup_db.sql"
$SqlScript | Out-File -FilePath $SqlFile -Encoding utf8

$mysqlTest = Invoke-ExternalCommand -FilePath $MysqlExe -Arguments @(
    "-u", "root",
    "--password=$RootPassPlain",
    "-e", "SELECT VERSION();"
)
Assert-CommandSuccess -Result $mysqlTest -ErrorMessage "Connexion MySQL root échouée."
Print-Success "Connexion root MySQL validée."

$mysqlImport = Invoke-ExternalCommand -FilePath $MysqlExe -Arguments @(
    "-u", "root",
    "--password=$RootPassPlain"
) -StdInFile $SqlFile
Assert-CommandSuccess -Result $mysqlImport -ErrorMessage "Création de la base MySQL échouée."
Print-Success "Base et utilisateur MySQL créés."

Remove-Item -Path $SqlFile -ErrorAction SilentlyContinue

# ------------------------------------------------------------
# Environment file
# ------------------------------------------------------------
Print-Step "Configuration de l'environnement"

$JwtSecret = New-RandomPassword -Length 64

$EnvContent = @"
# Database MySQL
DB_HOST=localhost
DB_PORT=3306
DB_NAME=$DbName
DB_USER=$DbUser
DB_PASSWORD=$DbPass

# Server
PORT=$BackendPort
NODE_ENV=production
CORS_ORIGIN=http://localhost:$FrontendPort

# Security
JWT_SECRET=$JwtSecret
"@

$EnvFile = Join-Path $ServerDir ".env"
$EnvContent | Out-File -FilePath $EnvFile -Encoding utf8
Print-Success "Fichier .env généré : $EnvFile"

# ------------------------------------------------------------
# Install dependencies + build
# ------------------------------------------------------------
Print-Step "Installation et build"

$frontendInstall = Invoke-ExternalCommand -FilePath $NpmExe -Arguments @("install") -WorkingDirectory $AppDir
Assert-CommandSuccess -Result $frontendInstall -ErrorMessage "Échec de npm install (frontend)."
Print-Success "Dépendances frontend installées."

$frontendBuild = Invoke-ExternalCommand -FilePath $NpmExe -Arguments @("run", "build") -WorkingDirectory $AppDir
Assert-CommandSuccess -Result $frontendBuild -ErrorMessage "Échec du build frontend."
Print-Success "Build frontend terminé."

$backendInstall = Invoke-ExternalCommand -FilePath $NpmExe -Arguments @("install") -WorkingDirectory $ServerDir
Assert-CommandSuccess -Result $backendInstall -ErrorMessage "Échec de npm install (backend)."
Print-Success "Dépendances backend installées."

$backendBuild = Invoke-ExternalCommand -FilePath $NpmExe -Arguments @("run", "build") -WorkingDirectory $ServerDir
Assert-CommandSuccess -Result $backendBuild -ErrorMessage "Échec du build backend."
Print-Success "Build backend terminé."

# ------------------------------------------------------------
# Create launcher
# ------------------------------------------------------------
Print-Step "Création des scripts de lancement"

$StartScript = @"
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
start "Weight Stream Frontend" cmd /k "cd /d ""%~dp0"" && ""$NpxExe"" serve -s dist -l $FrontendPort"

echo.
echo Application disponible sur :
echo   http://localhost:$FrontendPort
echo.
pause
"@

$StartBat = Join-Path $AppDir "start.bat"
$StartScript | Out-File -FilePath $StartBat -Encoding ascii
Print-Success "Script de lancement créé : $StartBat"

# ------------------------------------------------------------
# Final summary
# ------------------------------------------------------------
Print-Step "Installation terminée"

Write-Host ""
Write-Host "============================================" -ForegroundColor $ColorSuccess
Write-Host "Installation terminée avec succès" -ForegroundColor $ColorSuccess
Write-Host "============================================" -ForegroundColor $ColorSuccess
Write-Host ""
Write-Host "Répertoire : $AppDir" -ForegroundColor $ColorInfo
Write-Host "Backend    : http://localhost:$BackendPort" -ForegroundColor $ColorInfo
Write-Host "Frontend   : http://localhost:$FrontendPort" -ForegroundColor $ColorInfo
Write-Host ""
Write-Host "Base MySQL :" -ForegroundColor $ColorWarning
Write-Host "  DB   : $DbName"
Write-Host "  User : $DbUser"
Write-Host "  Pass : sauvegardé dans $EnvFile"
Write-Host ""
Write-Host "Pour lancer l'application :" -ForegroundColor $ColorInfo
Write-Host "  $StartBat"
Write-Host ""
