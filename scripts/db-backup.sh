#!/usr/bin/env bash
set -euo pipefail

# Diclik.com — PostgreSQL Backup & Restore Verification Script
# Requires DATABASE_URL or SQL_HOST/SQL_USER/SQL_DB_NAME/PGPASSWORD in production

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP="$(date -u +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/diclik_pg_${TIMESTAMP}.dump"

mkdir -p "$BACKUP_DIR"

if [ -n "${DATABASE_URL:-}" ]; then
  echo "[Diclik Backup] Ejecutando pg_dump comprimido desde DATABASE_URL..."
  pg_dump --format=custom --no-owner --no-privileges --dbname="$DATABASE_URL" --file="$BACKUP_FILE"
  echo "[Diclik Backup] Verificando integridad del archivo con pg_restore --list..."
  pg_restore --list "$BACKUP_FILE" > /dev/null
  echo "[Diclik Backup] Respaldo verificado exitosamente: $BACKUP_FILE"
else
  echo "[Diclik Backup] Nota: Define DATABASE_URL para respaldar una instancia PostgreSQL externa."
  echo "Ejemplo de restauración controlada:"
  echo "  pg_restore --clean --if-exists --no-owner --dbname=\"\$DATABASE_URL\" \"$BACKUP_FILE\""
fi
