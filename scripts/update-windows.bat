@echo off
REM ===========================================================================
REM  Weight Stream - Mise a jour rapide depuis main
REM  Pull, rebuild, redemarrer le service en une commande
REM ===========================================================================

setlocal
cd /d "%~dp0"

echo.
echo ============================================================
echo   Mise a jour Weight Stream
echo ============================================================
echo.

echo [1/5] Arret du service...
call "%~dp0stop.bat" >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/5] git pull origin main...
git pull origin main
if %errorlevel% neq 0 (
    echo.
    echo [ERREUR] git pull a echoue. Verifier la connexion ou les conflits.
    pause
    exit /b 1
)

echo.
echo [3/5] Rebuild frontend (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [ERREUR] Build frontend echoue.
    pause
    exit /b 1
)

echo.
echo [4/5] Rebuild backend (npm run build dans server/)...
pushd server
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [ERREUR] Build backend echoue.
    popd
    pause
    exit /b 1
)
popd

echo.
echo [5/5] Demarrage du service...
start "" "%~dp0start-background.bat"
timeout /t 3 /nobreak >nul

echo.
echo ============================================================
echo   Mise a jour terminee.
echo   IMPORTANT : sur le navigateur kiosque, faire Ctrl+Shift+R
echo   pour recharger sans cache, ou fermer/rouvrir l'onglet.
echo ============================================================
echo.
echo Application accessible : http://localhost:3001
echo.
pause
