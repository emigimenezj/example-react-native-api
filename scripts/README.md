# Scripts de Base de Datos

Esta carpeta contiene scripts para configurar y administrar la base de datos PostgreSQL con Electric.

## Requisitos Previos

- PostgreSQL 12 o superior instalado y corriendo
- Usuario con permisos de superusuario en PostgreSQL (por defecto: `postgres`)
- Permisos de ejecución en los scripts bash

## Scripts Disponibles

### 1. `setup-db.sh` - Configuración Inicial

Configura la base de datos desde cero, incluyendo:

- Creación del usuario `electric` con permisos de replicación
- Creación de la base de datos `example_react_native_db`
- Creación de las tablas `users` y `silobags`
- Configuración de REPLICA IDENTITY para Electric
- Permisos y publicación para replicación lógica

**Uso:**

```bash
cd scripts
chmod +x setup-db.sh
./setup-db.sh
```

Si tu usuario de PostgreSQL no es `postgres`, especifícalo así:

```bash
POSTGRES_USER=tu_usuario ./setup-db.sh
```

### 2. `init-db.sql` - Script SQL de Inicialización

Script SQL que contiene todas las instrucciones DDL para crear la estructura de la base de datos. Se ejecuta automáticamente por `setup-db.sh`, pero también puede ejecutarse manualmente:

```bash
psql -U postgres -f init-db.sql
```

### 3. `seed-db.sql` - Datos de Prueba

Inserta datos de ejemplo en la base de datos para desarrollo y testing:

- 3 usuarios de prueba
- 6 silobags distribuidos entre los usuarios

**Uso:**

```bash
psql -U postgres -f seed-db.sql
```

O ejecutarlo después del setup:

```bash
./setup-db.sh && psql -U postgres -f seed-db.sql
```

### 4. `reset-db.sh` - Resetear Base de Datos

Elimina completamente la base de datos y la vuelve a crear desde cero. **¡ADVERTENCIA: Eliminará todos los datos!**

**Uso:**

```bash
chmod +x reset-db.sh
./reset-db.sh
```

## Flujo de Trabajo Recomendado

### Configuración Inicial

1. Ejecutar el script de setup:

   ```bash
   cd scripts
   chmod +x *.sh
   ./setup-db.sh
   ```

2. (Opcional) Cargar datos de prueba:

   ```bash
   psql -U postgres -f seed-db.sql
   ```

3. Crear archivo `.env` en la raíz del proyecto:

   ```env
   DATABASE_URL=postgresql://electric:electric@localhost:5432/example_react_native_db
   PORT=3000
   ```

4. Iniciar Electric:

   ```bash
   docker-compose up -d
   ```

5. Iniciar la API:
   ```bash
   npm run dev
   ```

### Desarrollo Continuo

Si necesitas resetear la base de datos durante el desarrollo:

```bash
./reset-db.sh
```

## Estructura de la Base de Datos

### Tabla `users`

```sql
- id (SERIAL PRIMARY KEY)
- email (VARCHAR UNIQUE NOT NULL)
- created_at (TIMESTAMP)
```

### Tabla `silobags`

```sql
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER REFERENCES users)
- weight (NUMERIC)
- size (VARCHAR)
- species (VARCHAR)
- bagging_date (DATE)
- name (VARCHAR)
- created_at (TIMESTAMP)
```

## Configuración de Electric

Los scripts configuran automáticamente:

- **REPLICA IDENTITY FULL** en todas las tablas para capturar cambios completos
- **Publicación `electric_publication`** para replicación lógica
- **Usuario `electric`** con privilegios de replicación
- **Permisos completos** en tablas y secuencias

## Solución de Problemas

### PostgreSQL no está corriendo

```bash
# En Linux/Mac
sudo systemctl start postgresql
# o
brew services start postgresql

# Verificar
pg_isready
```

### Permisos denegados

Asegúrate de ejecutar los scripts con un usuario que tenga permisos de superusuario:

```bash
POSTGRES_USER=postgres ./setup-db.sh
```

### Electric no puede conectarse

Verifica que:

1. PostgreSQL esté aceptando conexiones en `localhost:5432`
2. El usuario `electric` tenga permisos de replicación
3. La configuración en `docker-compose.yml` sea correcta

## Conexión a la Base de Datos

```bash
# Como usuario electric
psql postgresql://electric:electric@localhost:5432/example_react_native_db

# Como postgres
psql -U postgres -d example_react_native_db
```
