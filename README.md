# Production Line Manager

Application de gestion des lignes de production avec pesage automatique et contrôle qualité.

## 🚀 Démarrage Rapide

### Lovable Cloud (Recommandé)

L'application est prête à l'emploi sur Lovable Cloud. Aucune configuration requise.

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

### Développement Local

```bash
# Cloner le repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Installer les dépendances
npm install

# Démarrer en mode développement
npm run dev
```

---

## 📋 Fonctionnalités

- **Gestion des lignes de production** : Configuration et supervision des lignes
- **Pesage automatique** : Intégration avec balances et cellules photoélectriques
- **Contrôle qualité** : Validation des poids avec tolérances configurables
- **Gestion des utilisateurs** : Rôles (admin, superviseur, opérateur)
- **Tableaux de bord** : Statistiques en temps réel
- **Multi-base de données** : Support PostgreSQL, MySQL, SQL Server

---

## 🖥️ Installation Auto-hébergée

### Prérequis

- Node.js 20.x
- MySQL 8.0 / PostgreSQL 15 / SQL Server 2019
- Nginx (recommandé)

### Guide d'Installation Complet

📖 **Ubuntu + MySQL** : [docs/INSTALLATION_UBUNTU_MYSQL.md](docs/INSTALLATION_UBUNTU_MYSQL.md)

### Installation Rapide (Ubuntu + MySQL)

```bash
# Télécharger et exécuter le script d'installation
sudo bash scripts/install-ubuntu-mysql.sh
```

### Configuration Manuelle

1. Configurez l'environnement :
```bash
cp .env.example .env
nano .env  # Modifiez les paramètres
```

2. Construisez pour la production :
```bash
npm run build
```

3. Déployez les fichiers du dossier `dist/` sur votre serveur web.

---

## 📁 Structure du Projet

```
├── docs/                    # Documentation
│   └── INSTALLATION_UBUNTU_MYSQL.md
├── scripts/                 # Scripts d'installation
│   └── install-ubuntu-mysql.sh
├── src/
│   ├── components/          # Composants React
│   ├── hooks/               # Hooks personnalisés
│   ├── lib/
│   │   └── database/        # Couche d'abstraction BDD
│   │       ├── adapters/    # Adaptateurs (MySQL, PostgreSQL, SQL Server)
│   │       └── schema.sql   # Schéma multi-bases
│   ├── pages/               # Pages de l'application
│   └── types/               # Types TypeScript
├── supabase/                # Configuration Lovable Cloud
└── .env.example             # Template de configuration
```

---

## 👥 Rôles Utilisateurs

| Rôle | Description | Permissions |
|------|-------------|-------------|
| **admin** | Administrateur système | Toutes les permissions |
| **supervisor** | Superviseur de production | Gestion des opérateurs et tâches |
| **operator** | Opérateur de ligne | Exécution des tâches de production |

---

## 🛠️ Technologies

- **Frontend** : React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend** : Lovable Cloud / Node.js (auto-hébergé)
- **Base de données** : PostgreSQL (Cloud) / MySQL, SQL Server (auto-hébergé)

---

## 🔒 Sécurité

- Authentification JWT
- Validation des entrées (client + serveur)
- Protection CSRF
- Headers de sécurité
- Chiffrement des mots de passe (bcrypt)

---

## 📚 Documentation

- [Guide d'installation Ubuntu + MySQL](docs/INSTALLATION_UBUNTU_MYSQL.md)
- [Schéma SQL multi-bases](src/lib/database/schema.sql)
- [Configuration](/.env.example)

---

## 🚀 Déploiement Lovable

Ouvrez [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) et cliquez sur **Share → Publish**.

### Domaine Personnalisé

Naviguez vers **Project > Settings > Domains** et cliquez sur **Connect Domain**.

[Documentation domaines personnalisés](https://docs.lovable.dev/features/custom-domain#custom-domain)

---

**Version** : 1.0.0  
**Dernière mise à jour** : Décembre 2024
