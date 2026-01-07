#!/bin/bash
# =============================================================================
# Script d'installation Weight Stream - Ubuntu Server avec PostgreSQL
# Version: 3.0.0 - Self-Hosted avec Backend Node.js + PostgreSQL
# Mise à jour: Janvier 2025
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
NODE_VERSION="20"

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
    
    # Vérifier Ubuntu
    if ! grep -q "Ubuntu" /etc/os-release 2>/dev/null; then
        print_warning "Ce script est optimisé pour Ubuntu. Continuez à vos risques."
    fi
    
    # Vérifier l'espace disque (minimum 2GB)
    DISK_FREE=$(df / | tail -1 | awk '{print $4}')
    if [ "$DISK_FREE" -lt 2000000 ]; then
        print_error "Espace disque insuffisant (minimum 2GB requis)"
        exit 1
    fi
    
    # Vérifier la RAM (minimum 1GB)
    RAM_TOTAL=$(free -m | awk '/^Mem:/{print $2}')
    if [ "$RAM_TOTAL" -lt 1000 ]; then
        print_warning "RAM faible détectée ($RAM_TOTAL MB). 1GB minimum recommandé."
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
    
    # Vérifier si Node.js est déjà installé
    if command -v node &> /dev/null; then
        CURRENT_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$CURRENT_VERSION" -ge "$NODE_VERSION" ]; then
            print_success "Node.js $(node --version) déjà installé"
            npm install -g pm2
            return
        fi
    fi
    
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt install -y nodejs
    npm install -g pm2
    print_success "Node.js $(node --version), Git et PM2 installés"
}

# Installation de PostgreSQL
install_postgresql() {
    print_step "Installation de PostgreSQL"
    
    # Vérifier si PostgreSQL est déjà installé
    if command -v psql &> /dev/null; then
        print_success "PostgreSQL déjà installé"
        systemctl start postgresql
        return
    fi
    
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
    print_success "PostgreSQL installé et démarré"
}

# Configuration de PostgreSQL
configure_postgresql() {
    print_step "Configuration de la base de données PostgreSQL"
    
    # Génération automatique du mot de passe
    DB_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
    
    sudo -u postgres psql <<EOF
-- Créer l'utilisateur
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
        CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASS';
    ELSE
        ALTER USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASS';
    END IF;
END
\$\$;

-- Créer la base de données
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Donner les droits
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

    # Accorder les droits sur le schéma public
    sudo -u postgres psql -d $DB_NAME <<EOF
GRANT ALL ON SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
EOF
    
    echo "$DB_PASS" > /tmp/db_pass.tmp
    chmod 600 /tmp/db_pass.tmp
    
    print_success "Base de données PostgreSQL '$DB_NAME' créée"
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
    location / {
        root $APP_DIR/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # API Backend (Node.js)
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # WebSocket support (pour les mises à jour temps réel)
    location /ws {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_read_timeout 86400;
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
        root $APP_DIR/dist;
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
    JWT_SECRET=$(openssl rand -base64 32)
    
    # Configuration du backend
    print_status "Configuration du backend Node.js..."
    cat > $APP_DIR/server/.env <<EOF
# Database PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASS

# Server
PORT=3001
NODE_ENV=production
CORS_ORIGIN=http://$SERVER_NAME

# Security
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

# Logging
LOG_LEVEL=info
EOF

    # Configuration du frontend
    cat > $APP_DIR/.env <<EOF
VITE_API_URL=/api
VITE_MODE=selfhosted
VITE_APP_NAME=Weight Stream
EOF

    # Build du backend
    print_status "Installation et build du backend..."
    cd $APP_DIR/server
    npm install --production=false
    npm run build
    
    # Build du frontend  
    print_status "Installation et build du frontend..."
    cd $APP_DIR
    npm install --production=false
    npm run build
    
    # Permissions
    chown -R www-data:www-data $APP_DIR
    
    print_success "Application déployée"
}

# Création de l'utilisateur admin par défaut
create_admin_user() {
    print_step "Création de l'utilisateur administrateur"
    
    read -p "Email de l'administrateur [admin@example.com]: " ADMIN_EMAIL
    ADMIN_EMAIL=${ADMIN_EMAIL:-admin@example.com}
    
    read -sp "Mot de passe de l'administrateur: " ADMIN_PASS
    echo ""
    
    if [ -z "$ADMIN_PASS" ]; then
        ADMIN_PASS=$(openssl rand -base64 12 | tr -dc 'a-zA-Z0-9' | head -c 12)
        print_warning "Mot de passe généré automatiquement: $ADMIN_PASS"
    fi
    
    # Hash du mot de passe avec bcrypt via Node.js
    cd $APP_DIR/server
    ADMIN_PASS_HASH=$(node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('$ADMIN_PASS', 10));" 2>/dev/null || echo "")
    
    if [ -n "$ADMIN_PASS_HASH" ]; then
        DB_PASS=$(cat /tmp/db_pass.tmp)
        
        PGPASSWORD="$DB_PASS" psql -h localhost -U $DB_USER -d $DB_NAME <<EOF
INSERT INTO users (id, email, password_hash, role, is_active, created_at, updated_at)
VALUES (gen_random_uuid(), '$ADMIN_EMAIL', '$ADMIN_PASS_HASH', 'admin', TRUE, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin';
EOF
        print_success "Administrateur créé: $ADMIN_EMAIL"
    else
        print_warning "Impossible de créer l'admin automatiquement. Créez-le via l'interface."
    fi
}

# Création des unités de poids par défaut
create_default_weight_units() {
    print_step "Création des unités de poids par défaut"
    
    DB_PASS=$(cat /tmp/db_pass.tmp)
    
    PGPASSWORD="$DB_PASS" psql -h localhost -U $DB_USER -d $DB_NAME <<EOF
INSERT INTO weight_units (id, code, name, symbol, decimal_precision, is_default, created_at, updated_at)
VALUES 
    (gen_random_uuid(), 'KG', 'Kilogramme', 'kg', 3, TRUE, NOW(), NOW()),
    (gen_random_uuid(), 'G', 'Gramme', 'g', 0, FALSE, NOW(), NOW()),
    (gen_random_uuid(), 'LB', 'Livre', 'lb', 2, FALSE, NOW(), NOW()),
    (gen_random_uuid(), 'OZ', 'Once', 'oz', 1, FALSE, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;
EOF
    
    print_success "Unités de poids créées (KG, G, LB, OZ)"
}

# Configuration PM2
setup_pm2() {
    print_step "Configuration de PM2"
    
    cd $APP_DIR/server
    
    # Créer le fichier de configuration PM2
    cat > $APP_DIR/ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: '$APP_NAME-api',
    script: 'dist/index.js',
    cwd: '$APP_DIR/server',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/var/log/$APP_NAME/error.log',
    out_file: '/var/log/$APP_NAME/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    max_memory_restart: '500M',
    restart_delay: 3000,
    max_restarts: 10
  }]
};
EOF

    mkdir -p /var/log/$APP_NAME
    chown -R www-data:www-data /var/log/$APP_NAME
    
    pm2 start $APP_DIR/ecosystem.config.js
    pm2 save
    pm2 startup systemd -u root --hp /root
    
    print_success "Backend configuré avec PM2 (mode cluster)"
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
    mkdir -p /var/backups/postgresql
    
    cat > /usr/local/bin/backup-$APP_NAME.sh <<EOF
#!/bin/bash
# Script de sauvegarde automatique - Weight Stream (PostgreSQL)
BACKUP_DIR="/var/backups/postgresql"
DATE=\$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Sauvegarde de la base de données
PGPASSWORD='$DB_PASS' pg_dump -h localhost -U $DB_USER $DB_NAME | gzip > \$BACKUP_DIR/${DB_NAME}_\${DATE}.sql.gz

# Suppression des anciennes sauvegardes
find \$BACKUP_DIR -name "*.sql.gz" -mtime +\$RETENTION_DAYS -delete

# Log
echo "\$(date): Sauvegarde effectuée - ${DB_NAME}_\${DATE}.sql.gz" >> /var/log/$APP_NAME/backup.log
EOF

    chmod +x /usr/local/bin/backup-$APP_NAME.sh
    (crontab -l 2>/dev/null | grep -v "backup-$APP_NAME"; echo "0 2 * * * /usr/local/bin/backup-$APP_NAME.sh") | crontab -
    
    print_success "Sauvegardes automatiques configurées (quotidien à 2h)"
}

# Exécution des tests
run_tests() {
    print_step "Exécution des tests de non-régression"
    
    cd $APP_DIR/server
    
    if [ -f "tests/weight-units.test.js" ]; then
        print_status "Exécution des tests des unités de poids..."
        node tests/weight-units.test.js || print_warning "Certains tests ont échoué"
    fi
    
    print_success "Tests terminés"
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
    echo -e "${CYAN}Application:${NC} Weight Stream v3.0.0"
    echo -e "${CYAN}Répertoire:${NC}  $APP_DIR"
    echo -e "${CYAN}URL:${NC}         http://$SERVER_NAME"
    echo ""
    echo -e "${YELLOW}Base de données PostgreSQL:${NC}"
    echo "  Base: $DB_NAME"
    echo "  User: $DB_USER"
    echo "  Port: 5432"
    echo "  Pass: voir $APP_DIR/server/.env"
    echo ""
    echo -e "${YELLOW}Unités de poids configurées:${NC}"
    echo "  - Kilogramme (kg) - par défaut"
    echo "  - Gramme (g)"
    echo "  - Livre (lb)"
    echo "  - Once (oz)"
    echo ""
    echo -e "${YELLOW}Prochaine étape (HTTPS recommandé):${NC}"
    echo "  sudo apt install certbot python3-certbot-nginx"
    echo "  sudo certbot --nginx -d $SERVER_NAME"
    echo ""
    echo -e "${YELLOW}Commandes utiles:${NC}"
    echo "  pm2 logs $APP_NAME-api      # Logs backend"
    echo "  pm2 restart $APP_NAME-api   # Redémarrer backend"
    echo "  pm2 status                   # Statut services"
    echo "  pm2 monit                    # Monitoring temps réel"
    echo "  sudo systemctl status postgresql  # Statut PostgreSQL"
    echo ""
    echo -e "${GREEN}Accès: http://$SERVER_NAME${NC}"
    echo ""
}

# Afficher l'aide
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --server-name=DOMAIN   Définir le nom de domaine/IP"
    echo "  --skip-tests           Ne pas exécuter les tests"
    echo "  --help                 Afficher cette aide"
    echo ""
    echo "Exemple:"
    echo "  sudo $0 --server-name=production.example.com"
}

# Exécution principale
main() {
    SKIP_TESTS=false
    
    # Parsing des arguments
    for arg in "$@"; do
        case $arg in
            --server-name=*)
                SERVER_NAME="${arg#*=}"
                ;;
            --skip-tests)
                SKIP_TESTS=true
                ;;
            --help)
                show_help
                exit 0
                ;;
        esac
    done
    
    echo "============================================"
    echo "  Weight Stream - Installation Self-Hosted"
    echo "  Ubuntu Server + PostgreSQL + Node.js"
    echo "  Version 3.0.0"
    echo "============================================"
    
    check_root
    check_system
    update_system
    install_nodejs
    install_postgresql
    configure_postgresql
    install_nginx
    configure_nginx
    deploy_application
    create_admin_user
    create_default_weight_units
    setup_pm2
    configure_firewall
    setup_backup
    
    if [ "$SKIP_TESTS" = false ]; then
        run_tests
    fi
    
    cleanup
    show_summary
}

# Démarrer l'installation
main "$@"
