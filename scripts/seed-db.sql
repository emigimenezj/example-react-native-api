-- Script para poblar la base de datos con datos de prueba
-- Ejecutar después de init-db.sql

\c example_react_native_db

-- Insertar usuarios de prueba
INSERT INTO users (email) VALUES
  ('juan.perez@example.com'),
  ('maria.gonzalez@example.com'),
  ('carlos.rodriguez@example.com')
ON CONFLICT (email) DO NOTHING;

-- Insertar silobags de prueba
INSERT INTO silobags (user_id, weight, size, species, bagging_date, name) VALUES
  (1, 15000.50, '200m', 'Soja', '2025-03-15', 'Silobag Lote 1'),
  (1, 12500.00, '180m', 'Maíz', '2025-04-20', 'Silobag Lote 2'),
  (1, 18000.75, '220m', 'Trigo', '2025-05-10', 'Silobag Lote 3'),
  (2, 16500.00, '200m', 'Soja', '2025-03-25', 'Silobag Campo Norte'),
  (2, 14000.50, '190m', 'Girasol', '2025-04-15', 'Silobag Campo Sur'),
  (3, 20000.00, '250m', 'Maíz', '2025-06-01', 'Silobag Principal')
ON CONFLICT DO NOTHING;

\echo 'Datos de prueba insertados correctamente!'
\echo 'Usuarios: 3'
\echo 'Silobags: 6'
