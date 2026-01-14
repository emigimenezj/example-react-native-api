-- Script de inicialización de la base de datos para Electric
-- Este script crea:
-- 1. Usuario 'electric' con permisos de replicación
-- 2. Base de datos 'example_react_native_db'
-- 3. Tablas 'users' y 'silobags'
-- 4. Configuración de Electric (REPLICA IDENTITY y permisos)

-- Nota: Este script debe ejecutarse como superusuario de PostgreSQL

-- Crear el usuario electric con permisos de replicación
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'electric') THEN
    CREATE ROLE electric WITH LOGIN PASSWORD 'electric' REPLICATION;
  END IF;
END
$$;

-- Conectar a la base de datos (si existe) o crearla
SELECT 'CREATE DATABASE example_react_native_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'example_react_native_db')\gexec

-- Conectarse a la base de datos
\c example_react_native_db

-- Otorgar permisos al usuario electric
GRANT ALL PRIVILEGES ON DATABASE example_react_native_db TO electric;
GRANT ALL PRIVILEGES ON SCHEMA public TO electric;

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear tabla users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla silobags
CREATE TABLE IF NOT EXISTS silobags (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weight NUMERIC(10, 2) NOT NULL CHECK (weight > 0),
  size VARCHAR(50) NOT NULL,
  species VARCHAR(100) NOT NULL,
  bagging_date DATE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_silobags_user_id ON silobags(user_id);
CREATE INDEX IF NOT EXISTS idx_silobags_created_at ON silobags(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Configuración para Electric: REPLICA IDENTITY FULL
-- Esto es necesario para que Electric pueda rastrear todos los cambios
ALTER TABLE users REPLICA IDENTITY FULL;
ALTER TABLE silobags REPLICA IDENTITY FULL;

-- Otorgar permisos completos al usuario electric en las tablas
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO electric;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO electric;

-- Configurar permisos por defecto para tablas futuras
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO electric;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO electric;

-- Crear una publicación para Electric (replicación lógica)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'electric_publication') THEN
    CREATE PUBLICATION electric_publication FOR ALL TABLES;
  END IF;
END
$$;

-- Mensaje de confirmación
\echo 'Base de datos configurada correctamente para Electric!'
\echo 'Usuario: electric'
\echo 'Password: electric'
\echo 'Database: example_react_native_db'
\echo 'Tablas creadas: users, silobags'
