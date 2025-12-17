# Guide d'Installation - Production Line Manager
## Ubuntu Server 22.04+ avec MySQL

---

## Prérequis Système

- Ubuntu Server 22.04 LTS ou supérieur
- 2 Go RAM minimum (4 Go recommandé)
- 20 Go d'espace disque
- Accès root ou sudo
- Connexion Internet

---

## 1. Mise à jour du système

```bash
sudo apt update && sudo apt upgrade -y
```

---

## 2. Installation de Node.js 20.x

```bash
# Ajouter le repository NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Installer Node.js
sudo apt install -y nodejs

# Vérifier l'installation
node --version  # Doit afficher v20.x.x
npm --version
```

---

## 3. Installation de MySQL 8.0

```bash
# Installer MySQL Server
sudo apt install -y mysql-server

# Sécuriser l'installation
sudo mysql_secure_installation
# Répondre aux questions:
# - VALIDATE PASSWORD component: Y (recommandé)
# - Password strength: 2 (STRONG)
# - Remove anonymous users: Y
# - Disallow root login remotely: Y
# - Remove test database: Y
# - Reload privilege tables: Y

# Démarrer et activer MySQL
sudo systemctl start mysql
sudo systemctl enable mysql
```

### Créer la base de données et l'utilisateur

```bash
sudo mysql -u root -p
```

```sql
-- Créer la base de données
CREATE DATABASE production_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Créer l'utilisateur applicatif
CREATE USER 'prod_app'@'localhost' IDENTIFIED BY 'VotreMotDePasseSecurise123!';

-- Accorder les privilèges
GRANT ALL PRIVILEGES ON production_manager.* TO 'prod_app'@'localhost';
FLUSH PRIVILEGES;

-- Quitter
EXIT;
```

---

## 4. Création du schéma de base de données

```bash
# Se connecter à MySQL
mysql -u prod_app -p production_manager
```

Exécuter le script SQL suivant :

```sql
-- ============================================
-- SCHÉMA MYSQL - Production Line Manager
-- ============================================

-- Table des rôles utilisateurs
CREATE TABLE user_roles (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    role ENUM('operator', 'supervisor', 'admin') NOT NULL DEFAULT 'operator',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_role (user_id, role),
    INDEX idx_user_id (user_id),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des utilisateurs (authentification personnalisée)
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    last_sign_in_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des unités de poids
CREATE TABLE weight_units (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    code VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    decimal_precision INT NOT NULL DEFAULT 3,
    is_default TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des produits
CREATE TABLE products (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    reference VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    target_weight DECIMAL(18,4) NOT NULL,
    tolerance_min DECIMAL(18,4) NOT NULL,
    tolerance_max DECIMAL(18,4) NOT NULL,
    weight_unit_id CHAR(36),
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_reference (reference),
    FOREIGN KEY (weight_unit_id) REFERENCES weight_units(id) ON DELETE SET NULL,
    INDEX idx_active (is_active),
    INDEX idx_reference (reference)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des lignes de production
CREATE TABLE production_lines (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    scale_url VARCHAR(500),
    photocell_url VARCHAR(500),
    weight_unit_id CHAR(36),
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (weight_unit_id) REFERENCES weight_units(id) ON DELETE SET NULL,
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des terminaux
CREATE TABLE terminals (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    device_uid VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    line_id CHAR(36),
    is_online TINYINT(1) NOT NULL DEFAULT 0,
    last_ping TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_device_uid (device_uid),
    UNIQUE KEY uk_line_id (line_id),
    FOREIGN KEY (line_id) REFERENCES production_lines(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des tâches de production
CREATE TABLE production_tasks (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    line_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    operator_id CHAR(36),
    target_quantity INT NOT NULL,
    produced_quantity INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (line_id) REFERENCES production_lines(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_line (line_id),
    INDEX idx_status (status),
    INDEX idx_operator (operator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des items produits
CREATE TABLE production_items (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    task_id CHAR(36) NOT NULL,
    sequence INT NOT NULL,
    weight DECIMAL(18,4) NOT NULL,
    status VARCHAR(50) NOT NULL,
    captured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES production_tasks(id) ON DELETE CASCADE,
    INDEX idx_task (task_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Données initiales : Unités de poids
INSERT INTO weight_units (code, name, symbol, decimal_precision, is_default) VALUES
('g', 'Gramme', 'g', 1, 1),
('kg', 'Kilogramme', 'kg', 3, 0),
('lb', 'Livre', 'lb', 3, 0),
('oz', 'Once', 'oz', 2, 0);

-- Créer le premier administrateur (mot de passe: Admin123!)
-- Le hash correspond à 'Admin123!' avec bcrypt
INSERT INTO users (id, email, password_hash, is_active) VALUES
(UUID(), 'admin@production.local', '$2b$10$rOzJqQZQZQZQZQZQZQZQZuExample.HashHere', 1);

-- Associer le rôle admin
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin' FROM users WHERE email = 'admin@production.local';
```

---

## 5. Installation de Nginx (Reverse Proxy)

```bash
sudo apt install -y nginx

# Activer et démarrer Nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### Configuration Nginx

```bash
sudo nano /etc/nginx/sites-available/production-manager
```

Contenu :

```nginx
server {
    listen 80;
    server_name votre-domaine.com;  # Remplacer par votre domaine ou IP

    # Redirection HTTP vers HTTPS (décommenter si SSL configuré)
    # return 301 https://$server_name$request_uri;

    location / {
        root /var/www/production-manager/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Sécurité
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

```bash
# Activer le site
sudo ln -s /etc/nginx/sites-available/production-manager /etc/nginx/sites-enabled/

# Supprimer le site par défaut
sudo rm /etc/nginx/sites-enabled/default

# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

---

## 6. Installation SSL avec Let's Encrypt (Optionnel mais recommandé)

```bash
sudo apt install -y certbot python3-certbot-nginx

# Obtenir le certificat
sudo certbot --nginx -d votre-domaine.com

# Renouvellement automatique (vérifié)
sudo certbot renew --dry-run
```

---

## 7. Déploiement de l'application

### Créer le répertoire d'installation

```bash
sudo mkdir -p /var/www/production-manager
sudo chown $USER:$USER /var/www/production-manager
```

### Cloner et construire l'application

```bash
cd /var/www/production-manager

# Cloner depuis GitHub
git clone https://github.com/mednabet/weight-stream.git .

# Installer les dépendances
npm install

# Créer le fichier de configuration
cp .env.example .env
nano .env
```

### Configuration de l'environnement (.env)

```env
# Base de données MySQL
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=production_manager
DB_USER=prod_app
DB_PASSWORD=VotreMotDePasseSecurise123!

# Application
VITE_APP_URL=https://votre-domaine.com
VITE_API_URL=https://votre-domaine.com/api

# Sécurité
JWT_SECRET=VotreCleSecreteTresLongueEtComplexe123!@#
SESSION_TIMEOUT=480

# Environnement
NODE_ENV=production
```

### Construire pour la production

```bash
npm run build
```

---

## 8. Service Systemd pour l'API

```bash
sudo nano /etc/systemd/system/production-api.service
```

Contenu :

```ini
[Unit]
Description=Production Manager API
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/production-manager
ExecStart=/usr/bin/node /var/www/production-manager/api/server.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=production-api
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
# Recharger systemd
sudo systemctl daemon-reload

# Démarrer et activer le service
sudo systemctl start production-api
sudo systemctl enable production-api

# Vérifier le statut
sudo systemctl status production-api
```

---

## 9. Configuration du Pare-feu

```bash
# Autoriser HTTP et HTTPS
sudo ufw allow 'Nginx Full'

# Autoriser SSH (important!)
sudo ufw allow ssh

# Activer le pare-feu
sudo ufw enable

# Vérifier le statut
sudo ufw status
```

---

## 10. Sauvegardes Automatiques

### Script de sauvegarde MySQL

```bash
sudo nano /usr/local/bin/backup-production-db.sh
```

```bash
#!/bin/bash
# Script de sauvegarde MySQL

BACKUP_DIR="/var/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="production_manager"
DB_USER="prod_app"
DB_PASS="VotreMotDePasseSecurise123!"

# Créer le répertoire si nécessaire
mkdir -p $BACKUP_DIR

# Effectuer la sauvegarde
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz

# Supprimer les sauvegardes de plus de 30 jours
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Sauvegarde terminée: ${DB_NAME}_${DATE}.sql.gz"
```

```bash
# Rendre exécutable
sudo chmod +x /usr/local/bin/backup-production-db.sh

# Ajouter au cron (sauvegarde quotidienne à 2h)
sudo crontab -e
```

Ajouter la ligne :
```
0 2 * * * /usr/local/bin/backup-production-db.sh >> /var/log/mysql-backup.log 2>&1
```

---

## 11. Monitoring et Logs

### Vérifier les logs

```bash
# Logs Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Logs API
sudo journalctl -u production-api -f

# Logs MySQL
sudo tail -f /var/log/mysql/error.log
```

### Installation de htop (monitoring système)

```bash
sudo apt install -y htop
htop
```

---

## 12. Commandes Utiles

```bash
# Redémarrer tous les services
sudo systemctl restart nginx production-api mysql

# Vérifier l'état des services
sudo systemctl status nginx production-api mysql

# Mettre à jour l'application
cd /var/www/production-manager
git pull
npm install
npm run build
sudo systemctl restart production-api

# Restaurer une sauvegarde
gunzip < /var/backups/mysql/production_manager_YYYYMMDD_HHMMSS.sql.gz | mysql -u prod_app -p production_manager
```

---

## Dépannage

### MySQL ne démarre pas
```bash
sudo journalctl -u mysql -n 50
sudo mysqld --verbose --help | grep -A 1 "Default options"
```

### Nginx erreur 502
```bash
# Vérifier que l'API est en cours d'exécution
sudo systemctl status production-api
# Vérifier les logs
sudo journalctl -u production-api -n 50
```

### Permission refusée
```bash
# Vérifier les permissions
ls -la /var/www/production-manager
# Corriger si nécessaire
sudo chown -R www-data:www-data /var/www/production-manager
```

---

## Contact Support

En cas de problème, créez un ticket sur le repository GitHub ou contactez l'équipe de support.

---

**Version:** 1.0.0  
**Dernière mise à jour:** Décembre 2024
