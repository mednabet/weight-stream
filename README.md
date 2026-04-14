# Weight Stream

**Application de gestion des lignes de production avec pesage automatique et contrôle qualité.**

Développé par [NETPROCESS](https://netprocess.ma) — Mohammed NABET (+212 661 550 618)

---

## Démarrage rapide

### Ubuntu (Production)

```bash
git clone https://github.com/mednabet/weight-stream.git
cd weight-stream
sudo bash scripts/install-ubuntu-mysql.sh
```

### Windows (PowerShell)

```powershell
git clone https://github.com/mednabet/weight-stream.git
cd weight-stream
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\install-windows.ps1
```

### Développement local

```bash
# Frontend (terminal 1)
npm install && npm run dev

# Backend (terminal 2)
cd server && npm install && npm run dev
```

---

## Fonctionnalités

| Fonctionnalité | Description |
|----------------|-------------|
| **Gestion des lignes** | Configuration et supervision des lignes en temps réel |
| **Pesage automatique** | Intégration avec balances industrielles (unitaire + palette) |
| **Contrôle qualité** | Validation des poids avec tolérances min/max configurables |
| **Gestion des palettes** | Pesage palette avec rapprochement production/conditionnement |
| **Unités de mesure** | Support des unités métriques (kg, g) et impériales (lb, oz) |
| **Gestion des utilisateurs** | Rôles hiérarchiques (admin, superviseur, opérateur) |
| **Tableaux de bord** | Statistiques et monitoring en temps réel |
| **Interface tactile** | Mode kiosque optimisé pour écran POS |

---

## Installation

### Prérequis

| Composant | Ubuntu | Windows |
|-----------|--------|---------|
| **OS** | Ubuntu 22.04 LTS+ | Windows 10/11 |
| **Node.js** | 22.x | 22.x |
| **MySQL** | 8.0+ | 8.0+ |
| **RAM** | 2 GB minimum | 4 GB minimum |
| **Disque** | 2 GB | 2 GB |

### Ubuntu — Installation automatique

Le script configure automatiquement tous les composants : Node.js, MySQL, Nginx, systemd, pare-feu et sauvegardes.

```bash
# Installation standard (demande le nom de domaine)
sudo bash scripts/install-ubuntu-mysql.sh

# Avec nom de domaine prédéfini
sudo bash scripts/install-ubuntu-mysql.sh --server-name=production.example.com
```

Le script effectue les opérations suivantes :

1. Installation de Node.js 22.x, MySQL 8.0 et Nginx
2. Création de la base de données et de l'utilisateur MySQL
3. Clonage, build frontend et backend
4. Configuration Nginx (reverse proxy, gzip, cache)
5. Création du service systemd
6. Configuration du pare-feu (UFW)
7. Mise en place des sauvegardes automatiques quotidiennes

### Windows — Installation automatique

Le script PowerShell vérifie les prérequis, configure MySQL, clone le projet, installe les dépendances et crée un script de lancement.

```powershell
# Ouvrir PowerShell en tant qu'Administrateur
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\install-windows.ps1
```

Après l'installation, lancez l'application avec :

```cmd
C:\WeightStream\start.bat
```

### Installation manuelle

Pour une installation personnalisée, consultez le guide détaillé : [docs/INSTALLATION_UBUNTU_MYSQL.md](docs/INSTALLATION_UBUNTU_MYSQL.md)

---

## Structure du projet

```
weight-stream/
├── docs/                        # Documentation
│   └── INSTALLATION_UBUNTU_MYSQL.md
├── scripts/                     # Scripts d'installation
│   ├── install-ubuntu-mysql.sh  # Installation Ubuntu + MySQL
│   └── install-windows.ps1      # Installation Windows
├── server/                      # Backend Node.js
│   ├── src/
│   │   ├── config/              # Configuration applicative
│   │   ├── db/                  # Connexion et initialisation BDD
│   │   ├── middleware/          # Authentification JWT, validation
│   │   └── routes/              # API REST
│   └── .env.example             # Modèle de configuration
├── src/                         # Frontend React
│   ├── components/              # Composants UI (shadcn/ui)
│   ├── contexts/                # Contextes React (Auth)
│   ├── hooks/                   # Hooks personnalisés
│   ├── lib/                     # Utilitaires et API client
│   └── pages/                   # Pages de l'application
└── package.json
```

---

## Rôles utilisateurs

| Rôle | Description | Permissions |
|------|-------------|-------------|
| **Admin** | Administrateur système | Gestion des superviseurs, unités de poids, configuration globale |
| **Superviseur** | Superviseur de production | Gestion des lignes, produits, opérateurs et tâches |
| **Opérateur** | Opérateur de ligne | Exécution des tâches de production, pesage |

---

## Technologies

| Catégorie | Technologies |
|-----------|--------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| **Backend** | Node.js, Express, TypeScript |
| **Base de données** | MySQL 8.0 |
| **Authentification** | JWT (JSON Web Tokens) |
| **Sécurité** | Helmet, express-rate-limit, bcrypt 12 rounds |
| **Serveur Web** | Nginx (Ubuntu), serve (Windows) |

---

## Sécurité

| Mesure | Description |
|--------|-------------|
| **JWT obligatoire** | Secret min 32 caractères, refus de démarrer sinon |
| **Helmet** | Headers de sécurité HTTP (HSTS, X-Frame-Options, etc.) |
| **Rate limiting** | 500 req/15min global, 15/15min sur auth |
| **CORS strict** | Origines autorisées uniquement, pas de wildcard |
| **Bcrypt 12 rounds** | Hachage sécurisé des mots de passe |
| **Setup verrouillé** | Routes de configuration bloquées après installation |
| **Signup verrouillé** | Inscription désactivée après le premier admin |
| **Proxy sécurisé** | Whitelist des URLs de balance configurées |

---

## Commandes utiles

### Ubuntu (systemd)

```bash
sudo systemctl status weight-stream     # Statut du backend
sudo journalctl -u weight-stream -f     # Logs en temps réel
sudo systemctl restart weight-stream    # Redémarrer le backend
curl -s http://localhost:3001/api/health # Health check
sudo /usr/local/bin/backup-weight-stream.sh  # Sauvegarde manuelle
```

### Windows

```cmd
C:\WeightStream\start.bat              # Démarrer l'application
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [Guide d'installation Ubuntu](docs/INSTALLATION_UBUNTU_MYSQL.md) | Installation complète Ubuntu + MySQL |
| [Script Ubuntu](scripts/install-ubuntu-mysql.sh) | Installation automatique Ubuntu |
| [Script Windows](scripts/install-windows.ps1) | Installation automatique Windows |

---

## Support

Pour toute question ou assistance technique, contactez [NETPROCESS](https://netprocess.ma).

---

**Version** : 4.0.0
**Dernière mise à jour** : Avril 2026
**Auteur** : [NETPROCESS](https://netprocess.ma) — Mohammed NABET (+212 661 550 618)
