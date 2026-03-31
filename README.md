# Weight Stream

**Application de gestion des lignes de production avec pesage automatique et contrôle qualité.**

Développé par [NETPROCESS](https://netprocess.ma) - Solutions digitales innovantes pour l'industrie.

---

## 🚀 Démarrage Rapide

### Installation Auto-hébergée (Recommandé)

```bash
# Cloner le repository
git clone https://github.com/mednabet/weight-stream.git
cd weight-stream

# Exécuter le script d'installation (Ubuntu + MySQL)
sudo bash scripts/install-ubuntu-mysql.sh
```

### Développement Local

```bash
# Installer les dépendances
npm install

# Démarrer le frontend
npm run dev

# Dans un autre terminal, démarrer le backend
cd server && npm install && npm run dev
```

---

## 📋 Fonctionnalités

| Fonctionnalité | Description |
|----------------|-------------|
| **Gestion des lignes de production** | Configuration et supervision des lignes en temps réel |
| **Pesage automatique** | Intégration avec balances industrielles et cellules photoélectriques |
| **Contrôle qualité** | Validation des poids avec tolérances min/max configurables |
| **Unités de mesure** | Support des unités métriques (kg, g) et impériales (lb, oz) |
| **Gestion des utilisateurs** | Rôles hiérarchiques (admin, superviseur, opérateur) |
| **Tableaux de bord** | Statistiques et monitoring en temps réel |
| **Interface tactile** | Mode kiosque optimisé pour les opérateurs |

---

## 🖥️ Installation Auto-hébergée

### Prérequis

| Composant | Version minimale |
|-----------|------------------|
| Ubuntu Server | 20.04 LTS |
| Node.js | 20.x |
| MySQL | 8.0 |
| RAM | 1 GB |
| Espace disque | 2 GB |

### Installation Automatique

Le script d'installation configure automatiquement tous les composants nécessaires :

```bash
# Installation standard
sudo bash scripts/install-ubuntu-mysql.sh

# Avec nom de domaine prédéfini
sudo bash scripts/install-ubuntu-mysql.sh --server-name=production.example.com

# Sans exécution des tests
sudo bash scripts/install-ubuntu-mysql.sh --skip-tests
```

Le script effectue les opérations suivantes :
- Installation de Node.js, MySQL et Nginx
- Configuration de la base de données
- Déploiement de l'application
- Création des unités de poids par défaut (kg, g, lb, oz)
- Configuration de PM2 pour la gestion des processus
- Mise en place des sauvegardes automatiques

### Configuration Manuelle

Pour une installation personnalisée, consultez le guide détaillé : [docs/INSTALLATION_UBUNTU_MYSQL.md](docs/INSTALLATION_UBUNTU_MYSQL.md)

---

## 📁 Structure du Projet

```
weight-stream/
├── docs/                    # Documentation
├── scripts/                 # Scripts d'installation
│   └── install-ubuntu-mysql.sh
├── server/                  # Backend Node.js
│   ├── src/
│   │   ├── db/              # Connexion et initialisation BDD
│   │   ├── middleware/      # Authentification JWT
│   │   └── routes/          # API REST
│   └── tests/               # Tests automatisés
├── src/                     # Frontend React
│   ├── components/          # Composants UI
│   ├── contexts/            # Contextes React (Auth)
│   ├── hooks/               # Hooks personnalisés
│   ├── lib/                 # Utilitaires et API client
│   └── pages/               # Pages de l'application
└── supabase/                # Configuration Supabase (optionnel)
```

---

## 👥 Rôles Utilisateurs

| Rôle | Description | Permissions |
|------|-------------|-------------|
| **Admin** | Administrateur système | Gestion des superviseurs, unités de poids, configuration globale |
| **Superviseur** | Superviseur de production | Gestion des lignes, produits, opérateurs et tâches |
| **Opérateur** | Opérateur de ligne | Exécution des tâches de production, pesage |

---

## ⚖️ Unités de Mesure

L'application supporte les unités de poids suivantes (configurables) :

| Code | Nom | Symbole | Décimales |
|------|-----|---------|-----------|
| KG | Kilogramme | kg | 3 |
| G | Gramme | g | 0 |
| LB | Livre | lb | 2 |
| OZ | Once | oz | 1 |

---

## 🛠️ Technologies

| Catégorie | Technologies |
|-----------|--------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| **Backend** | Node.js, Express, TypeScript |
| **Base de données** | MySQL 8.0 |
| **Authentification** | JWT (JSON Web Tokens) |
| **Process Manager** | PM2 |
| **Serveur Web** | Nginx |

---

## 🔒 Sécurité

L'application intègre plusieurs couches de sécurité :

| Mesure | Description |
|--------|-------------|
| Authentification JWT | Tokens sécurisés avec expiration configurable |
| Chiffrement bcrypt | Mots de passe hashés avec salt |
| Validation des entrées | Côté client et serveur |
| Headers de sécurité | X-Frame-Options, X-Content-Type-Options, X-XSS-Protection |
| CORS configuré | Origines autorisées définies |

---

## 🧪 Tests

Exécution des tests automatisés :

```bash
# Tests des unités de mesure
cd server && node tests/weight-units.test.js
```

Les tests vérifient les opérations CRUD sur les unités de poids et garantissent la non-régression.

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Guide d'installation](docs/INSTALLATION_UBUNTU_MYSQL.md) | Installation complète Ubuntu + MySQL |
| [Tests automatisés](server/tests/README.md) | Documentation des tests |
| [Schéma SQL](src/lib/database/schema.sql) | Structure de la base de données |

---

## 🔧 Commandes Utiles

```bash
# Logs du backend
pm2 logs weight-stream-api

# Redémarrer le backend
pm2 restart weight-stream-api

# Statut des services
pm2 status

# Monitoring temps réel
pm2 monit

# Sauvegarde manuelle de la base de données
sudo /usr/local/bin/backup-weight-stream.sh
```

---

# Script pour installation windows :

@echo off
setlocal enabledelayedexpansion
title Weight Stream - Setup Windows

echo =========================================================
echo   WEIGHT STREAM - INSTALLATION AUTOMATIQUE WINDOWS
echo =========================================================
echo.

REM ---------------------------------------------------------
REM 0) Verification des prerequis
REM ---------------------------------------------------------
where git >nul 2>nul
if errorlevel 1 (
    echo [ERREUR] Git n'est pas installe ou n'est pas dans le PATH.
    echo Installe Git puis relance ce script.
    pause
    exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
    echo [ERREUR] Node.js n'est pas installe ou n'est pas dans le PATH.
    echo Installe Node.js 20+ puis relance ce script.
    pause
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERREUR] npm n'est pas disponible.
    pause
    exit /b 1
)

echo [OK] Git detecte
echo [OK] Node.js detecte
echo [OK] npm detecte
echo.

for /f "delims=" %%i in ('node -v') do set NODE_VER=%%i
for /f "delims=" %%i in ('npm -v') do set NPM_VER=%%i

echo Version Node.js : %NODE_VER%
echo Version npm     : %NPM_VER%
echo.

REM ---------------------------------------------------------
REM 1) Se placer dans le dossier du script
REM ---------------------------------------------------------
cd /d "%~dp0"

if not exist package.json (
    echo [ERREUR] package.json introuvable.
    echo Place ce fichier setup-windows.bat a la racine du projet weight-stream.
    pause
    exit /b 1
)

if not exist server\package.json (
    echo [ERREUR] server\package.json introuvable.
    echo Le projet semble incomplet.
    pause
    exit /b 1
)

echo [OK] Structure du projet detectee
echo.

REM ---------------------------------------------------------
REM 2) Creation du fichier .env si absent
REM ---------------------------------------------------------
if not exist .env (
    if exist .env.example (
        echo [INFO] Creation du fichier .env a partir de .env.example
        copy /Y ".env.example" ".env" >nul
        echo [OK] .env cree
    ) else (
        echo [INFO] Aucun .env.example trouve, creation d'un .env minimal
        (
            echo DB_TYPE=mysql
            echo DB_HOST=localhost
            echo DB_PORT=3306
            echo DB_NAME=production_manager
            echo DB_USER=prod_app
            echo DB_PASSWORD=CHANGEZ_CE_MOT_DE_PASSE
            echo VITE_APP_URL=http://localhost:8080
            echo VITE_API_URL=http://localhost:3000/api
            echo API_PORT=3000
            echo JWT_SECRET=CHANGEZ_CETTE_CLE_SECRETE_TRES_LONGUE
            echo SESSION_TIMEOUT=480
            echo NODE_ENV=development
            echo DEBUG=true
        ) > .env
        echo [OK] .env minimal cree
    )
) else (
    echo [INFO] Le fichier .env existe deja, aucune modification
)
echo.

REM ---------------------------------------------------------
REM 3) Installation frontend
REM ---------------------------------------------------------
echo =========================================================
echo Installation des dependances FRONTEND...
echo =========================================================
call npm install
if errorlevel 1 (
    echo [ERREUR] Echec de npm install a la racine.
    pause
    exit /b 1
)
echo [OK] Frontend installe
echo.

REM ---------------------------------------------------------
REM 4) Installation backend
REM ---------------------------------------------------------
echo =========================================================
echo Installation des dependances BACKEND...
echo =========================================================
pushd server
call npm install
if errorlevel 1 (
    popd
    echo [ERREUR] Echec de npm install dans le dossier server.
    pause
    exit /b 1
)
popd
echo [OK] Backend installe
echo.

REM ---------------------------------------------------------
REM 5) Menu de lancement
REM ---------------------------------------------------------
:menu
echo =========================================================
echo Installation terminee
echo =========================================================
echo 1 - Lancer frontend + backend
echo 2 - Lancer frontend seulement
echo 3 - Lancer backend seulement
echo 4 - Ouvrir le dossier .env
echo 5 - Quitter
echo.
set /p choice=Choix :

if "%choice%"=="1" goto run_all
if "%choice%"=="2" goto run_front
if "%choice%"=="3" goto run_back
if "%choice%"=="4" goto open_env
if "%choice%"=="5" goto end

echo Choix invalide.
echo.
goto menu

:run_all
echo [INFO] Lancement du backend...
start "Weight Stream Backend" cmd /k "cd /d "%~dp0server" && npm run dev"

timeout /t 2 /nobreak >nul

echo [INFO] Lancement du frontend...
start "Weight Stream Frontend" cmd /k "cd /d "%~dp0" && npm run dev"

echo.
echo [OK] Les deux services ont ete lances dans deux fenetres separees.
echo Frontend : verifier l'URL affichee par Vite
echo Backend  : verifier le port API affiche
echo.
pause
goto end

:run_front
start "Weight Stream Frontend" cmd /k "cd /d "%~dp0" && npm run dev"
goto end

:run_back
start "Weight Stream Backend" cmd /k "cd /d "%~dp0server" && npm run dev"
goto end

:open_env
start "" notepad "%~dp0.env"
goto menu

:end
endlocal
exit /b 0

# Utilisation
Mets ce fichier dans le dossier racine du projet, au même niveau que package.json.
Nomme-le par exemple setup-windows.bat.
Clique droit → Exécuter ou lance-le depuis cmd.
Le script :
vérifie git, node, npm,
crée .env depuis .env.example si besoin,
installe les dépendances frontend et backend,
peut lancer les deux serveurs.
Ces étapes correspondent bien à la structure et aux scripts présents dans le dépôt.

## 📞 Support

Pour toute question ou assistance technique, contactez [NETPROCESS](https://netprocess.ma).

---

## 📄 Licence

© 2024 [NETPROCESS](https://netprocess.ma). Tous droits réservés.

---

**Version** : 2.1.0  
**Dernière mise à jour** : Décembre 2024  
**Développeur** : [NETPROCESS](https://netprocess.ma)
