#!/bin/bash

# Script para configurar la base de datos PostgreSQL con Electric
# Este script debe ejecutarse con un usuario que tenga permisos de superusuario en PostgreSQL

set -e

echo "🚀 Iniciando configuración de la base de datos..."

# Variables de configuración
DB_NAME="example_react_native_db"
DB_USER="electric"
DB_PASSWORD="electric"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Verificar si PostgreSQL está corriendo
if ! pg_isready -q; then
  echo "❌ Error: PostgreSQL no está corriendo. Por favor, inicia el servicio PostgreSQL."
  exit 1
fi

echo "✅ PostgreSQL está corriendo"

# Ejecutar el script SQL como superusuario
echo "📝 Ejecutando script de inicialización..."
psql -U "$POSTGRES_USER" -f "$SCRIPT_DIR/init-db.sql"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ ¡Base de datos configurada exitosamente!"
  echo ""
  echo "📋 Detalles de conexión:"
  echo "   Database: $DB_NAME"
  echo "   User: $DB_USER"
  echo "   Password: $DB_PASSWORD"
  echo "   Connection String: postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
  echo ""
  echo "🔧 Siguiente paso:"
  echo "   1. Crea un archivo .env en la raíz del proyecto con:"
  echo "      DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
  echo "      PORT=3000"
  echo ""
  echo "   2. Inicia Electric con:"
  echo "      docker-compose up -d"
  echo ""
  echo "   3. Inicia la API con:"
  echo "      npm run dev"
else
  echo "❌ Error al configurar la base de datos"
  exit 1
fi
