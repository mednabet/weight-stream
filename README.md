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

## 📞 Support

Pour toute question ou assistance technique, contactez [NETPROCESS](https://netprocess.ma).

---

## 📄 Licence

© 2024 [NETPROCESS](https://netprocess.ma). Tous droits réservés.

---

**Version** : 2.1.0  
**Dernière mise à jour** : Décembre 2024  
**Développeur** : [NETPROCESS](https://netprocess.ma)
