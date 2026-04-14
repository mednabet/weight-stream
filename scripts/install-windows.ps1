<#
.SYNOPSIS
Script d'installation Weight Stream pour Windows
Auteur: NETPROCESS (https://netprocess.ma)
Développeur: Mohammed NABET (+212 661 550 618)
Version: 4.0.0

.DESCRIPTION
Ce script installe et configure Weight Stream sur un environnement Windows.
Il vérifie les prérequis (Node.js, Git, MySQL), clone le dépôt, installe les dépendances,
configure les variables d'environnement et prépare l'application pour le lancement.

.NOTES
L'exécution de ce script nécessite des privilèges d'administrateur.
#>

# Forcer l'exécution en tant qu'administrateur
if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Warning "Ce script doit être exécuté en tant qu'Administrateur."
    Write-Host "Veuillez relancer PowerShell en tant qu'Administrateur et réexécuter le script."
    Exit
}

$ErrorActionPreference = "Stop"

# Couleurs
$ColorInfo = "Cyan"
$ColorSuccess = "Green"
$ColorWarning = "Yellow"
$ColorError = "Red"

function Print-Step {
    param([string]$Message)
    Write-Host "`n=== $Message ===" -ForegroundColor $ColorInfo
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

# Variables
$AppDir = "C:\WeightStream"
$RepoUrl = "https://github.com/mednabet/weight-stream.git"
$DbName = "production_manager"
$DbUser = "prod_app"

Print-Step "Vérification des prérequis"

# Vérifier Node.js
try {
    $NodeVersion = node -v
    Print-Success "Node.js est installé ($NodeVersion)"
} catch {
    Print-Error "Node.js n'est pas installé. Veuillez l'installer depuis https://nodejs.org/ (Version 22.x recommandée)"
    Exit
}

# Vérifier Git
try {
    $GitVersion = git --version
    Print-Success "Git est installé ($GitVersion)"
} catch {
    Print-Error "Git n'est pas installé. Veuillez l'installer depuis https://git-scm.com/"
    Exit
}

# Vérifier MySQL
try {
    $MysqlVersion = mysql -V
    Print-Success "MySQL est installé ($MysqlVersion)"
} catch {
    Print-Warning "MySQL ne semble pas être dans le PATH ou n'est pas installé."
    Write-Host "Assurez-vous que MySQL Server 8.0+ est installé et en cours d'exécution."
    $continue = Read-Host "Voulez-vous continuer quand même ? (O/N)"
    if ($continue -notmatch "^[OoYy]") { Exit }
}

Print-Step "Configuration de la base de données"
Write-Host "Veuillez entrer le mot de passe root de MySQL pour créer la base de données."
$MysqlRootPass = Read-Host -AsSecureString "Mot de passe root MySQL"
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($MysqlRootPass)
$RootPassPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Générer un mot de passe aléatoire pour l'utilisateur de l'app
$DbPass = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 16 | % {[char]$_})

$SqlScript = @"
CREATE DATABASE IF NOT EXISTS $DbName CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DbUser'@'localhost' IDENTIFIED BY '$DbPass';
ALTER USER '$DbUser'@'localhost' IDENTIFIED BY '$DbPass';
GRANT ALL PRIVILEGES ON $DbName.* TO '$DbUser'@'localhost';
FLUSH PRIVILEGES;
"@

$SqlFile = "$env:TEMP\setup_db.sql"
$SqlScript | Out-File -FilePath $SqlFile -Encoding UTF8

try {
    mysql -u root -p"$RootPassPlain" < $SqlFile
    Print-Success "Base de données et utilisateur créés avec succès."
} catch {
    Print-Error "Échec de la configuration de la base de données. Vérifiez le mot de passe root."
    Exit
} finally {
    Remove-Item -Path $SqlFile -ErrorAction SilentlyContinue
}

Print-Step "Déploiement de l'application"

if (Test-Path $AppDir) {
    Print-Warning "Le dossier $AppDir existe déjà."
    $overwrite = Read-Host "Voulez-vous le supprimer et recommencer ? (O/N)"
    if ($overwrite -match "^[OoYy]") {
        Remove-Item -Path $AppDir -Recurse -Force
    } else {
        Print-Error "Installation annulée."
        Exit
    }
}

Write-Host "Clonage du dépôt GitHub..."
git clone $RepoUrl $AppDir

# Générer un JWT Secret
$JwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})

Print-Step "Configuration de l'environnement"

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

$EnvContent | Out-File -FilePath "$AppDir\server\.env" -Encoding UTF8
Print-Success "Fichier .env généré."

Print-Step "Installation des dépendances et Build"

Write-Host "Installation des dépendances Frontend..."
Set-Location $AppDir
npm install

Write-Host "Build du Frontend..."
npm run build

Write-Host "Installation des dépendances Backend..."
Set-Location "$AppDir\server"
npm install --production=false

Write-Host "Build du Backend..."
npm run build

Print-Step "Création des scripts de lancement"

$StartScript = @"
@echo off
echo ============================================
echo   Weight Stream - Lancement
echo   Auteur: NETPROCESS (https://netprocess.ma)
echo ============================================

cd /d "%~dp0"

echo Demarrage du Backend (Port 3001)...
start "Weight Stream Backend" cmd /c "cd server && node dist/index.js"

echo Demarrage du Frontend (Port 8080)...
start "Weight Stream Frontend" cmd /c "npx serve -s dist -l 8080"

echo.
echo Application demarree !
echo Acces: http://localhost:8080
echo.
pause
"@

$StartScript | Out-File -FilePath "$AppDir\start.bat" -Encoding ASCII
Print-Success "Script de lancement (start.bat) créé."

Print-Step "Installation terminée"
Write-Host ""
Write-Host "============================================" -ForegroundColor $ColorSuccess
Write-Host "Installation terminée avec succès!" -ForegroundColor $ColorSuccess
Write-Host "============================================" -ForegroundColor $ColorSuccess
Write-Host ""
Write-Host "Application: Weight Stream v4.0.0" -ForegroundColor $ColorInfo
Write-Host "Auteur:      NETPROCESS (https://netprocess.ma)" -ForegroundColor $ColorInfo
Write-Host "Répertoire:  $AppDir" -ForegroundColor $ColorInfo
Write-Host ""
Write-Host "Base de données MySQL:" -ForegroundColor $ColorWarning
Write-Host "  Base: $DbName"
Write-Host "  User: $DbUser"
Write-Host "  Pass: (sauvegardé dans $AppDir\server\.env)"
Write-Host ""
Write-Host "Pour démarrer l'application, exécutez :" -ForegroundColor $ColorInfo
Write-Host "  $AppDir\start.bat"
Write-Host ""
Write-Host "Le premier utilisateur inscrit deviendra automatiquement administrateur." -ForegroundColor $ColorSuccess
Write-Host ""
