#!/bin/bash

# Script para resetear completamente la base de datos
# ADVERTENCIA: Este script eliminará todos los datos

set -e

DB_NAME="example_react_native_db"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "⚠️  ADVERTENCIA: Este script eliminará TODOS los datos de la base de datos."
read -p "¿Estás seguro de que quieres continuar? (yes/no): " confirmation

if [ "$confirmation" != "yes" ]; then
  echo "❌ Operación cancelada"
  exit 0
fi

echo "🗑️  Eliminando base de datos existente..."

# Desconectar todas las conexiones activas y eliminar la base de datos
psql -U "$POSTGRES_USER" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" 2>/dev/null || true
psql -U "$POSTGRES_USER" -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
psql -U "$POSTGRES_USER" -c "DROP PUBLICATION IF EXISTS electric_publication;" 2>/dev/null || true

echo "🔄 Recreando base de datos..."

# Ejecutar el script de inicialización
"$SCRIPT_DIR/setup-db.sh"

echo "✅ Base de datos reseteada correctamente"
