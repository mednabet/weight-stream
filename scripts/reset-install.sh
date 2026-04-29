#!/bin/bash
# =============================================================================
# Script de remise à zéro Weight Stream - Ubuntu Server
# Auteur: NETPROCESS (https://netprocess.ma)
# =============================================================================
# Supprime totalement l'installation existante (BDD, fichiers, service,
# nginx, cron de sauvegarde) puis relance install-ubuntu-mysql.sh.
#
# Usage:
#   sudo bash scripts/reset-install.sh
#   sudo bash scripts/reset-install.sh --yes               # sans confirmation
#   sudo bash scripts/reset-install.sh --keep-backups      # garde /var/backups
#   sudo bash scripts/reset-install.sh --no-reinstall      # nettoyage seul
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

APP_NAME="weight-stream"
APP_DIR="/var/www/$APP_NAME"
DB_NAME="production_manager"
DB_USER="prod_app"
SERVICE_NAME="weight-stream"
NGINX_SITE="weight-stream"
BACKUP_DIR="/var/backups/weight-stream"
BACKUP_SCRIPT="/usr/local/bin/backup-weight-stream.sh"
INSTALL_SCRIPT_NAME="install-ubuntu-mysql.sh"

ASSUME_YES=0
KEEP_BACKUPS=0
DO_REINSTALL=1

for arg in "$@"; do
    case "$arg" in
        --yes|-y)        ASSUME_YES=1 ;;
        --keep-backups)  KEEP_BACKUPS=1 ;;
        --no-reinstall)  DO_REINSTALL=0 ;;
        *) echo "Argument inconnu: $arg"; exit 1 ;;
    esac
done

print_status()  { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[OK]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
print_step()    { echo -e "\n${CYAN}=== $1 ===${NC}\n"; }

if [ "$EUID" -ne 0 ]; then
    print_error "Ce script doit être exécuté en tant que root (sudo)"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─── Confirmation ─────────────────────────────────────────────────────────
print_step "Remise à zéro de Weight Stream"
echo -e "${YELLOW}ATTENTION : cette opération va supprimer DÉFINITIVEMENT :${NC}"
echo "  • La base de données MySQL '$DB_NAME' (toutes les données de production)"
echo "  • L'utilisateur MySQL '$DB_USER'"
echo "  • Le dossier de l'application : $APP_DIR"
echo "  • Le service systemd : $SERVICE_NAME"
echo "  • La configuration Nginx : $NGINX_SITE"
echo "  • Le cron de sauvegarde : $BACKUP_SCRIPT"
if [ "$KEEP_BACKUPS" -eq 0 ]; then
    echo "  • Les sauvegardes : $BACKUP_DIR"
else
    echo -e "  ${GREEN}• Sauvegardes conservées : $BACKUP_DIR${NC}"
fi
echo

if [ "$ASSUME_YES" -ne 1 ]; then
    read -r -p "Confirmer en tapant 'RESET' : " confirm
    if [ "$confirm" != "RESET" ]; then
        print_warning "Annulé."
        exit 1
    fi
fi

# ─── Sauvegarde de sécurité avant suppression ─────────────────────────────
print_step "Sauvegarde de sécurité préalable"
SAFETY_DIR="/var/backups/weight-stream-pre-reset"
mkdir -p "$SAFETY_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

if systemctl is-active --quiet mysql 2>/dev/null && mysql -e "USE $DB_NAME" 2>/dev/null; then
    SAFETY_FILE="$SAFETY_DIR/db_${DB_NAME}_${TIMESTAMP}.sql.gz"
    if mysqldump --single-transaction --quick --lock-tables=false "$DB_NAME" 2>/dev/null | gzip > "$SAFETY_FILE"; then
        print_success "Dump de sécurité : $SAFETY_FILE"
    else
        rm -f "$SAFETY_FILE"
        print_warning "Dump de sécurité échoué (la base sera quand même supprimée)"
    fi
else
    print_status "Aucune base existante à sauvegarder"
fi

if [ -f "$APP_DIR/server/.env" ]; then
    cp "$APP_DIR/server/.env" "$SAFETY_DIR/server.env.${TIMESTAMP}"
    print_success "Copie de server/.env : $SAFETY_DIR/server.env.${TIMESTAMP}"
fi

# ─── Arrêt et suppression du service systemd ──────────────────────────────
print_step "Suppression du service systemd"
if systemctl list-unit-files | grep -q "^${SERVICE_NAME}\.service"; then
    systemctl stop "$SERVICE_NAME" 2>/dev/null || true
    systemctl disable "$SERVICE_NAME" 2>/dev/null || true
    rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
    systemctl daemon-reload
    systemctl reset-failed 2>/dev/null || true
    print_success "Service $SERVICE_NAME supprimé"
else
    print_status "Aucun service systemd à supprimer"
fi

# ─── Suppression de la configuration Nginx ────────────────────────────────
print_step "Suppression de la configuration Nginx"
if [ -f "/etc/nginx/sites-enabled/$NGINX_SITE" ] || [ -f "/etc/nginx/sites-available/$NGINX_SITE" ]; then
    rm -f "/etc/nginx/sites-enabled/$NGINX_SITE"
    rm -f "/etc/nginx/sites-available/$NGINX_SITE"
    if systemctl is-active --quiet nginx; then
        nginx -t 2>/dev/null && systemctl reload nginx || print_warning "Nginx reload échoué"
    fi
    print_success "Configuration Nginx supprimée"
else
    print_status "Aucune configuration Nginx à supprimer"
fi

# ─── Suppression du dossier applicatif ────────────────────────────────────
print_step "Suppression du dossier $APP_DIR"
if [ -d "$APP_DIR" ]; then
    rm -rf "$APP_DIR"
    print_success "$APP_DIR supprimé"
else
    print_status "Aucun dossier applicatif"
fi

# ─── Suppression de la base et de l'utilisateur MySQL ─────────────────────
print_step "Suppression de la base MySQL"
if systemctl is-active --quiet mysql 2>/dev/null; then
    mysql <<EOF || print_warning "Erreur MySQL (continuer)"
DROP DATABASE IF EXISTS \`$DB_NAME\`;
DROP USER IF EXISTS '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF
    print_success "Base '$DB_NAME' et utilisateur '$DB_USER' supprimés"
else
    print_warning "MySQL n'est pas actif — étape ignorée"
fi

# ─── Suppression du cron de sauvegarde ────────────────────────────────────
print_step "Suppression du cron de sauvegarde"
rm -f "$BACKUP_SCRIPT"
rm -f /etc/cron.d/weight-stream-backup
crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT" | crontab - 2>/dev/null || true
print_success "Cron de sauvegarde supprimé"

# ─── Suppression des sauvegardes (optionnel) ──────────────────────────────
if [ "$KEEP_BACKUPS" -eq 0 ] && [ -d "$BACKUP_DIR" ]; then
    print_step "Suppression des sauvegardes"
    rm -rf "$BACKUP_DIR"
    print_success "$BACKUP_DIR supprimé"
fi

# ─── Nettoyage des logs systemd résiduels ─────────────────────────────────
journalctl --vacuum-time=1s --unit="$SERVICE_NAME" 2>/dev/null || true

print_step "Nettoyage terminé"
print_success "Weight Stream a été désinstallé"
echo "Sauvegardes de sécurité disponibles dans : $SAFETY_DIR"

# ─── Relance de l'installation ────────────────────────────────────────────
if [ "$DO_REINSTALL" -eq 1 ]; then
    INSTALLER="$SCRIPT_DIR/$INSTALL_SCRIPT_NAME"
    if [ ! -f "$INSTALLER" ]; then
        print_error "Installeur introuvable : $INSTALLER"
        print_status "Lancez manuellement : sudo bash $INSTALL_SCRIPT_NAME"
        exit 1
    fi

    print_step "Relance de l'installation"
    bash "$INSTALLER" "$@"
else
    echo
    print_status "Pour réinstaller plus tard :"
    echo "  sudo bash $SCRIPT_DIR/$INSTALL_SCRIPT_NAME"
fi
