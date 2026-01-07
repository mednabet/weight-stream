# Installation sur Ubuntu avec PostgreSQL

Ce guide détaille l'installation complète de Weight Stream sur un serveur Ubuntu avec PostgreSQL.

## Prérequis

- Ubuntu 20.04+ ou Debian 11+
- Accès root ou sudo
- Connexion Internet

## 1. Mise à jour du système

```bash
sudo apt update && sudo apt upgrade -y
```

## 2. Installation de Node.js 20+

```bash
# Installation via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git build-essential

# Vérification
node --version  # v20.x.x
npm --version   # 10.x.x

# Installation de PM2
sudo npm install -g pm2
```

## 3. Installation de PostgreSQL

```bash
# Installation de PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Démarrage et activation au boot
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Vérification
sudo systemctl status postgresql
```

## 4. Configuration de PostgreSQL

```bash
# Connexion en tant que postgres
sudo -u postgres psql

# Créer la base de données et l'utilisateur
CREATE DATABASE production_manager;
CREATE USER prod_app WITH ENCRYPTED PASSWORD 'votre_mot_de_passe_securise';
GRANT ALL PRIVILEGES ON DATABASE production_manager TO prod_app;

-- Connexion à la base pour accorder les droits sur le schéma public
\c production_manager
GRANT ALL ON SCHEMA public TO prod_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO prod_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO prod_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO prod_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO prod_app;

-- Sortir
\q
```

## 5. Installation de l'application

```bash
# Cloner le dépôt
cd /opt
sudo git clone https://github.com/votre-repo/weight-stream.git
sudo chown -R $USER:$USER weight-stream
cd weight-stream

# Installation des dépendances frontend
npm install
npm run build

# Installation des dépendances backend
cd server
npm install
npm run build
```

## 6. Configuration du backend

```bash
# Créer le fichier .env
cd /opt/weight-stream/server
cat > .env << 'EOF'
# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=production_manager
DB_USER=prod_app
DB_PASSWORD=votre_mot_de_passe_securise

# Server
PORT=3001
CORS_ORIGIN=http://localhost:5173,https://votre-domaine.com

# Security (générer une clé secrète forte)
JWT_SECRET=$(openssl rand -base64 32)
EOF
```

## 7. Configuration de PM2

```bash
cd /opt/weight-stream/server

# Créer la configuration PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'weight-stream-api',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '500M'
  }]
};
EOF

# Créer le dossier de logs
mkdir -p logs

# Démarrer l'application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 8. Installation de Nginx

```bash
sudo apt install -y nginx

# Configuration du site
sudo tee /etc/nginx/sites-available/weight-stream << 'EOF'
server {
    listen 80;
    server_name votre-domaine.com;

    # Frontend (fichiers statiques)
    location / {
        root /opt/weight-stream/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache pour les assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API Backend
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF

# Activer le site
sudo ln -s /etc/nginx/sites-available/weight-stream /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 9. Configuration HTTPS avec Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com

# Renouvellement automatique
sudo certbot renew --dry-run
```

## 10. Configuration du Firewall

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw enable
```

## 11. Création de l'utilisateur admin

```bash
cd /opt/weight-stream/server

# Hash du mot de passe (remplacer VotreMotDePasse)
PASSWORD_HASH=$(node -e "const bcrypt=require('bcryptjs');console.log(bcrypt.hashSync('VotreMotDePasse',10))")

# Insérer l'admin dans la base
sudo -u postgres psql production_manager << EOF
INSERT INTO users (id, email, password_hash, is_active)
VALUES (gen_random_uuid(), 'admin@votre-domaine.com', '$PASSWORD_HASH', true);

INSERT INTO user_roles (id, user_id, role)
SELECT gen_random_uuid(), id, 'admin' FROM users WHERE email = 'admin@votre-domaine.com';
EOF
```

## 12. Sauvegarde automatique

```bash
# Script de backup
sudo tee /opt/weight-stream/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/weight-stream/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
PGPASSWORD='votre_mot_de_passe_securise' pg_dump -h localhost -U prod_app production_manager > "$BACKUP_DIR/db_$DATE.sql"

# Compression
gzip "$BACKUP_DIR/db_$DATE.sql"

# Garder seulement les 7 derniers backups
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/db_$DATE.sql.gz"
EOF

sudo chmod +x /opt/weight-stream/backup.sh

# Cron job quotidien à 2h du matin
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/weight-stream/backup.sh") | crontab -
```

## Commandes utiles

```bash
# Statut des services
sudo systemctl status postgresql
sudo systemctl status nginx
pm2 status

# Logs
pm2 logs weight-stream-api
sudo tail -f /var/log/nginx/error.log

# Redémarrage
pm2 restart weight-stream-api
sudo systemctl restart nginx

# Mise à jour de l'application
cd /opt/weight-stream
git pull
npm install && npm run build
cd server && npm install && npm run build
pm2 restart weight-stream-api
```

## Dépannage

### Erreur de connexion PostgreSQL

```bash
# Vérifier que PostgreSQL écoute
sudo netstat -tlnp | grep 5432

# Vérifier les logs PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*-main.log

# Tester la connexion
PGPASSWORD='votre_mot_de_passe' psql -h localhost -U prod_app -d production_manager -c "SELECT 1"
```

### Erreur de permission Nginx

```bash
# Vérifier les permissions
ls -la /opt/weight-stream/dist/

# Corriger si nécessaire
sudo chown -R www-data:www-data /opt/weight-stream/dist/
```

### L'API ne répond pas

```bash
# Vérifier que le port est ouvert
curl -v http://localhost:3001/api/health

# Vérifier les logs PM2
pm2 logs weight-stream-api --lines 50
```
