#!/bin/bash
# =============================================================================
# Script d'installation Weight Stream - Ubuntu Server avec MySQL
# Auteur: NETPROCESS (https://netprocess.ma)
# Développeur: Mohammed NABET (+212 661 550 618)
# Version: 4.0.0 - Production Ready (Node.js + MySQL + Nginx + Systemd)
# =============================================================================

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Variables configurables
APP_NAME="weight-stream"
APP_DIR="/var/www/$APP_NAME"
DB_NAME="production_manager"
DB_USER="prod_app"
GITHUB_REPO="https://github.com/mednabet/weight-stream.git"
SERVER_NAME=""
NODE_VERSION="22"

# Fonctions d'affichage
print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[OK]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_step() { echo -e "\n${CYAN}=== $1 ===${NC}\n"; }

# Vérification root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "Ce script doit être exécuté en tant que root (sudo)"
        exit 1
    fi
}

# Vérification des prérequis système
check_system() {
    print_step "Vérification du système"
    
    if ! grep -q "Ubuntu" /etc/os-release 2>/dev/null; then
        print_warning "Ce script est optimisé pour Ubuntu. Continuez à vos risques."
    fi
    
    DISK_FREE=$(df / | tail -1 | awk '{print $4}')
    if [ "$DISK_FREE" -lt 2000000 ]; then
        print_error "Espace disque insuffisant (minimum 2GB requis)"
        exit 1
    fi
    
    RAM_TOTAL=$(free -m | awk '/^Mem:/{print $2}')
    if [ "$RAM_TOTAL" -lt 1000 ]; then
        print_warning "RAM faible détectée ($RAM_TOTAL MB). 2GB minimum recommandé."
    fi
    
    print_success "Système compatible"
}

# Mise à jour du système
update_system() {
    print_step "Mise à jour du système"
    apt update && apt upgrade -y
    print_success "Système mis à jour"
}

# Installation de Node.js et Git
install_nodejs() {
    print_step "Installation de Node.js $NODE_VERSION.x"
    apt install -y git curl build-essential
    
    if command -v node &> /dev/null; then
        CURRENT_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$CURRENT_VERSION" -ge "$NODE_VERSION" ]; then
            print_success "Node.js $(node --version) déjà installé"
            return
        fi
    fi
    
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt install -y nodejs
    print_success "Node.js $(node --version) et Git installés"
}

# Installation de MySQL
install_mysql() {
    print_step "Installation de MySQL"
    
    if command -v mysql &> /dev/null; then
        print_success "MySQL déjà installé"
        systemctl start mysql
        return
    fi
    
    apt install -y mysql-server
    systemctl start mysql
    systemctl enable mysql
    print_success "MySQL installé et démarré"
}

# Configuration de MySQL
configure_mysql() {
    print_step "Configuration de la base de données MySQL"
    
    DB_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
    
    mysql -u root <<EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF
    
    echo "$DB_PASS" > /tmp/db_pass.tmp
    chmod 600 /tmp/db_pass.tmp
    
    print_success "Base de données MySQL '$DB_NAME' configurée"
}

# Installation de Nginx
install_nginx() {
    print_step "Installation de Nginx"
    apt install -y nginx
    systemctl enable nginx
    systemctl start nginx
    print_success "Nginx installé"
}

# Configuration de Nginx
configure_nginx() {
    print_step "Configuration de Nginx"
    
    if [ -z "$SERVER_NAME" ]; then
        read -p "Entrez le nom de domaine ou l'adresse IP du serveur: " SERVER_NAME
    fi
    
    cat > /etc/nginx/sites-available/$APP_NAME <<EOF
server {
    listen 80;
    server_name $SERVER_NAME;

    # Frontend (fichiers statiques)
    root $APP_DIR/dist;
    index index.html;

    # API Backend (Node.js)
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 30s;
    }

    # SPA fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Sécurité
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Cache des assets statiques
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

    ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t
    systemctl reload nginx
    
    print_success "Nginx configuré pour $SERVER_NAME"
}

# Cloner et déployer l'application
deploy_application() {
    print_step "Déploiement de l'application"
    
    print_status "Clonage depuis GitHub..."
    rm -rf $APP_DIR
    mkdir -p $APP_DIR
    git clone $GITHUB_REPO $APP_DIR
    
    cd $APP_DIR
    
    DB_PASS=$(cat /tmp/db_pass.tmp)
    JWT_SECRET=$(openssl rand -base64 64)
    
    # Configuration du backend
    print_status "Configuration du backend Node.js..."
    cat > $APP_DIR/server/.env <<EOF
# Database MySQL
DB_HOST=localhost
DB_PORT=3306
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASS

# Server
PORT=3001
NODE_ENV=production
CORS_ORIGIN=http://$SERVER_NAME

# Security
JWT_SECRET=$JWT_SECRET
EOF

    # Build du frontend  
    print_status "Installation et build du frontend..."
    cd $APP_DIR
    npm install
    npm run build
    
    # Build du backend
    print_status "Installation et build du backend..."
    cd $APP_DIR/server
    npm install --production=false
    npm run build
    
    # Permissions
    chown -R www-data:www-data $APP_DIR
    
    print_success "Application déployée"
}

# Configuration Systemd
setup_systemd() {
    print_step "Configuration du service Systemd"
    
    cat > /etc/systemd/system/$APP_NAME.service <<EOF
[Unit]
Description=Weight Stream API Server
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=$APP_DIR/server
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=$APP_NAME
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable $APP_NAME
    systemctl start $APP_NAME
    
    print_success "Service Systemd configuré et démarré"
}

# Configuration du pare-feu
configure_firewall() {
    print_step "Configuration du pare-feu"
    ufw allow 'Nginx Full'
    ufw allow ssh
    ufw --force enable
    print_success "Pare-feu configuré (HTTP, HTTPS, SSH)"
}

# Configuration des sauvegardes
setup_backup() {
    print_step "Configuration des sauvegardes automatiques"
    
    DB_PASS=$(cat /tmp/db_pass.tmp)
    mkdir -p /var/backups/$APP_NAME
    
    cat > /usr/local/bin/backup-$APP_NAME.sh <<EOF
#!/bin/bash
# Script de sauvegarde automatique - Weight Stream (MySQL)
BACKUP_DIR="/var/backups/$APP_NAME"
DATE=\$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Sauvegarde de la base de données
mysqldump -u $DB_USER -p'$DB_PASS' $DB_NAME | gzip > \$BACKUP_DIR/${DB_NAME}_\${DATE}.sql.gz

# Suppression des anciennes sauvegardes
find \$BACKUP_DIR -name "*.sql.gz" -mtime +\$RETENTION_DAYS -delete

# Log
echo "\$(date): Sauvegarde effectuée - ${DB_NAME}_\${DATE}.sql.gz" >> /var/log/mysql-backup.log
EOF

    chmod +x /usr/local/bin/backup-$APP_NAME.sh
    (crontab -l 2>/dev/null | grep -v "backup-$APP_NAME"; echo "0 2 * * * /usr/local/bin/backup-$APP_NAME.sh") | crontab -
    
    print_success "Sauvegardes automatiques configurées (quotidien à 2h)"
}

# Nettoyage
cleanup() {
    print_step "Nettoyage"
    rm -f /tmp/db_pass.tmp
    apt autoremove -y
    print_success "Nettoyage effectué"
}

# Résumé final
show_summary() {
    echo ""
    echo "============================================"
    echo -e "${GREEN}Installation terminée avec succès!${NC}"
    echo "============================================"
    echo ""
    echo -e "${CYAN}Application:${NC} Weight Stream v4.0.0"
    echo -e "${CYAN}Auteur:${NC}      NETPROCESS (https://netprocess.ma)"
    echo -e "${CYAN}Répertoire:${NC}  $APP_DIR"
    echo -e "${CYAN}URL:${NC}         http://$SERVER_NAME"
    echo ""
    echo -e "${YELLOW}Base de données MySQL:${NC}"
    echo "  Base: $DB_NAME"
    echo "  User: $DB_USER"
    echo "  Pass: voir $APP_DIR/server/.env"
    echo ""
    echo -e "${YELLOW}Prochaine étape (HTTPS recommandé):${NC}"
    echo "  sudo apt install certbot python3-certbot-nginx"
    echo "  sudo certbot --nginx -d $SERVER_NAME"
    echo ""
    echo -e "${YELLOW}Commandes utiles:${NC}"
    echo "  sudo systemctl status $APP_NAME   # Statut du backend"
    echo "  sudo journalctl -u $APP_NAME -f   # Logs du backend"
    echo "  sudo systemctl restart $APP_NAME  # Redémarrer le backend"
    echo ""
    echo -e "${GREEN}Accès: http://$SERVER_NAME${NC}"
    echo -e "${GREEN}Le premier utilisateur inscrit deviendra automatiquement administrateur.${NC}"
    echo ""
}

# Afficher l'aide
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --server-name=DOMAIN   Définir le nom de domaine/IP"
    echo "  --help                 Afficher cette aide"
    echo ""
    echo "Exemple:"
    echo "  sudo $0 --server-name=production.example.com"
}

# Exécution principale
main() {
    # Parsing des arguments
    for arg in "$@"; do
        case $arg in
            --server-name=*)
                SERVER_NAME="${arg#*=}"
                ;;
            --help)
                show_help
                exit 0
                ;;
        esac
    done
    
    echo "============================================"
    echo "  Weight Stream - Installation Production"
    echo "  Ubuntu Server + MySQL + Node.js + Nginx"
    echo "  Auteur: NETPROCESS (https://netprocess.ma)"
    echo "============================================"
    
    check_root
    check_system
    update_system
    install_nodejs
    install_mysql
    configure_mysql
    install_nginx
    configure_nginx
    deploy_application
    setup_systemd
    configure_firewall
    setup_backup
    cleanup
    show_summary
}

# Démarrer l'installation
main "$@"
