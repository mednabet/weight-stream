# Weight Stream — Guide de déploiement Ubuntu + MySQL

**Auteur :** NETPROCESS — [https://netprocess.ma](https://netprocess.ma)
**Développeur :** Mohammed NABET — +212 661 550 618
**Version :** 2.0.0
**Dernière mise à jour :** Avril 2026

---

Ce guide détaille l'installation complète de Weight Stream en production sur un serveur Ubuntu avec MySQL.

## Prérequis système

Le serveur doit disposer d'Ubuntu 22.04 LTS ou supérieur, avec un minimum de 2 Go de RAM et 20 Go d'espace disque. Un accès root ou sudo est nécessaire pour l'installation des dépendances système.

---

## 1. Installation des dépendances

### Mise à jour du système

```bash
sudo apt update && sudo apt upgrade -y
```

### Node.js 22.x

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v  # Doit afficher v22.x
```

### MySQL 8.0

```bash
sudo apt-get install -y mysql-server
sudo mysql_secure_installation
sudo systemctl enable mysql
sudo systemctl start mysql
```

### Nginx (reverse proxy)

```bash
sudo apt-get install -y nginx
sudo systemctl enable nginx
```

---

## 2. Configuration de la base de données

La base de données est créée automatiquement par l'application au premier démarrage. Il suffit de créer l'utilisateur MySQL et la base vide.

```bash
sudo mysql -u root -p
```

```sql
CREATE DATABASE production_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'prod_app'@'localhost' IDENTIFIED BY 'VOTRE_MOT_DE_PASSE_SECURISE';
GRANT ALL PRIVILEGES ON production_manager.* TO 'prod_app'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Les tables suivantes seront créées automatiquement au démarrage : `users`, `user_roles`, `weight_units`, `products`, `production_lines`, `terminals`, `production_tasks`, `production_items`, et `pallets`.

---

## 3. Déploiement de l'application

### Cloner le projet

```bash
sudo mkdir -p /var/www/weight-stream
sudo chown $USER:$USER /var/www/weight-stream
cd /var/www/weight-stream
git clone https://github.com/mednabet/weight-stream.git .
```

### Build du frontend

```bash
npm install
npm run build
```

Le build génère les fichiers statiques dans le dossier `dist/`.

### Build du backend

```bash
cd server
npm install --production
npm run build
```

Le build génère les fichiers compilés dans `server/dist/`.

### Configuration de l'environnement

Créez le fichier `server/.env` à partir du modèle :

```bash
cp server/.env.example server/.env
nano server/.env
```

Modifiez les valeurs suivantes :

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DB_HOST` | Hôte MySQL | `localhost` |
| `DB_PORT` | Port MySQL | `3306` |
| `DB_NAME` | Nom de la base | `production_manager` |
| `DB_USER` | Utilisateur MySQL | `prod_app` |
| `DB_PASSWORD` | Mot de passe MySQL | *(votre mot de passe)* |
| `PORT` | Port du serveur API | `3001` |
| `NODE_ENV` | Environnement | `production` |
| `CORS_ORIGIN` | Origines autorisées | `https://votre-domaine.com` |
| `JWT_SECRET` | Clé secrète JWT (min 32 car.) | *(générer avec openssl)* |

Pour générer une clé JWT sécurisée :

```bash
openssl rand -base64 64
```

---

## 4. Configuration Nginx

Créez le fichier de configuration Nginx :

```bash
sudo nano /etc/nginx/sites-available/weight-stream
```

```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    # Frontend (fichiers statiques)
    root /var/www/weight-stream/dist;
    index index.html;

    # API backend (port 3001)
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
        proxy_read_timeout 30s;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Sécurité
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
```

Activez le site et redémarrez Nginx :

```bash
sudo ln -s /etc/nginx/sites-available/weight-stream /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## 5. SSL avec Let's Encrypt (recommandé)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com
sudo certbot renew --dry-run
```

Certbot modifiera automatiquement la configuration Nginx pour activer HTTPS.

---

## 6. Service systemd

Créez le service pour démarrer le backend automatiquement :

```bash
sudo nano /etc/systemd/system/weight-stream.service
```

```ini
[Unit]
Description=Weight Stream API Server
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/weight-stream/server
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=weight-stream
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Activez et démarrez le service :

```bash
sudo chown -R www-data:www-data /var/www/weight-stream
sudo systemctl daemon-reload
sudo systemctl enable weight-stream
sudo systemctl start weight-stream
sudo systemctl status weight-stream
```

---

## 7. Pare-feu

```bash
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Le port 3001 ne doit pas être ouvert publiquement car Nginx fait office de reverse proxy.

---

## 8. Premier accès

Après le démarrage, accédez à `https://votre-domaine.com`. Le premier utilisateur qui s'inscrit devient automatiquement administrateur. L'inscription publique est ensuite désactivée automatiquement. Les comptes suivants doivent être créés par un administrateur via l'interface de gestion.

---

## 9. Sauvegardes

Configurez une sauvegarde quotidienne de la base de données :

```bash
sudo nano /etc/cron.daily/weight-stream-backup
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/weight-stream"
mkdir -p "$BACKUP_DIR"
mysqldump -u prod_app -p'VOTRE_MOT_DE_PASSE' production_manager | gzip > "$BACKUP_DIR/db_$(date +%Y%m%d_%H%M%S).sql.gz"
# Conserver les 30 derniers jours
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +30 -delete
```

```bash
sudo chmod +x /etc/cron.daily/weight-stream-backup
```

Pour restaurer une sauvegarde :

```bash
gunzip < /var/backups/weight-stream/db_YYYYMMDD_HHMMSS.sql.gz | mysql -u prod_app -p production_manager
```

---

## 10. Surveillance

Vérifiez l'état du service et consultez les logs :

```bash
# État du service
sudo systemctl status weight-stream

# Logs en temps réel
sudo journalctl -u weight-stream -f

# Health check API
curl -s http://localhost:3001/api/health
```

---

## 11. Mise à jour

Pour mettre à jour l'application :

```bash
cd /var/www/weight-stream
git pull origin main
npm install && npm run build
cd server && npm install --production && npm run build
sudo systemctl restart weight-stream
```

---

## Sécurité en production

L'application intègre les mesures de sécurité suivantes en mode production :

| Mesure | Détail |
|--------|--------|
| **JWT obligatoire** | Le serveur refuse de démarrer si `JWT_SECRET` n'est pas défini (min 32 caractères) |
| **Helmet** | Headers de sécurité HTTP (X-Frame-Options, HSTS, X-Content-Type-Options, etc.) |
| **Rate limiting** | 500 req/15min global, 15 req/15min sur login/signup |
| **CORS strict** | Seules les origines configurées sont autorisées (pas de wildcard) |
| **Setup verrouillé** | Les routes de configuration sont bloquées après la première installation |
| **Signup verrouillé** | L'inscription publique est désactivée après le premier administrateur |
| **Proxy balance sécurisé** | Seules les URLs configurées dans les lignes de production sont autorisées |
| **Bcrypt 12 rounds** | Hachage des mots de passe avec 12 rounds de salage |
| **Validation mot de passe** | Minimum 12 caractères, majuscule, minuscule, chiffre, caractère spécial |
| **Trust proxy** | Configuration correcte pour fonctionner derrière Nginx |

---

## Dépannage

### MySQL ne démarre pas

```bash
sudo journalctl -u mysql -n 50
```

### Nginx erreur 502

```bash
sudo systemctl status weight-stream
sudo journalctl -u weight-stream -n 50
```

### Le serveur refuse de démarrer (JWT_SECRET)

En production, le serveur exige que la variable `JWT_SECRET` soit définie et contienne au moins 32 caractères. Vérifiez le fichier `server/.env`.

### Permission refusée

```bash
sudo chown -R www-data:www-data /var/www/weight-stream
```

---

## Contact Support

**NETPROCESS** — [https://netprocess.ma](https://netprocess.ma)
**Mohammed NABET** — +212 661 550 618
