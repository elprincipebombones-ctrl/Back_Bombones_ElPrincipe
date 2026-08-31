# Backend API — Node.js + Express + PostgreSQL + Sequelize

Backend REST API con autenticación JWT, sistema de roles, permisos y menús dinámicos.

## Requisitos

- Node.js LTS (>= 18)
- PostgreSQL >= 13

## Instalación

```bash
npm install
cp .env.example .env
# Edita .env con tus credenciales de PostgreSQL
```

## Base de datos

Crea la base indicada en `DB_NAME` (por ejemplo `backend_api`) en PostgreSQL, luego:

```bash
npm run migrate
npm run seed
```

Esto crea todas las tablas y siembra:

- Roles: **Administrador**, Supervisor, Empleado, Invitado
- Permisos por módulo (Usuarios, Roles, Permisos, Menus, Inventario, Compras, Ventas, Configuracion)
- Menús dinámicos
- Usuario administrador:
  - **correo:** `admin@empresa.com`
  - **password:** `Admin123*`

## Ejecución

```bash
npm run dev    # desarrollo (nodemon)
npm run start  # producción
```

Servidor: `http://localhost:3000`
Documentación Swagger: `http://localhost:3000/api/docs`

## Scripts

| Script | Descripción |
|---|---|
| `npm run dev` | Ejecuta con nodemon |
| `npm run start` | Ejecuta en producción |
| `npm run migrate` | Ejecuta migraciones |
| `npm run migrate:undo` | Revierte la última migración |
| `npm run seed` | Ejecuta todos los seeders |
| `npm run undo` | Revierte todos los seeders |
| `npm run lint` | Linter |

## Estructura

```
controllers/     Lógica de negocio HTTP
database/        Configuración Sequelize, migraciones y seeders
middleware/      Auth, permisos, validaciones, errores, rate-limit
models/          Modelos Sequelize + asociaciones
routes/          Endpoints
sockets/         Socket.IO
utils/           Helpers (JWT, respuestas, errores)
validators/      Reglas express-validator
app.js           Punto de entrada
swagger.js       Configuración de Swagger
```

## Endpoints principales

Base: `/api`

### Auth
- `POST /api/auth/login` — Devuelve `{ token, refreshToken, usuario, rol, permisos, menus }`
- `POST /api/auth/refresh` — Renueva tokens
- `GET  /api/auth/perfil` — Perfil del usuario autenticado

### CRUD (requieren JWT + permisos)
- `/api/usuarios`
- `/api/roles`
- `/api/permisos`
- `/api/menus`

Todos los endpoints CRUD requieren header:

```
Authorization: Bearer <token>
```

Y el permiso correspondiente (por ejemplo `Usuarios.Crear`) asignado al rol del usuario.

## Postman

Importa `postman/BackendAPI.postman_collection.json`. La colección incluye una variable `{{baseUrl}}` y guarda automáticamente el token tras el login.

## Variables de entorno

Ver `.env.example`.

### Evidencias del módulo Calidad

Los archivos JPG, JPEG, PNG y PDF se guardan fuera de PostgreSQL. Configuración opcional:

```env
CALIDAD_EVIDENCIAS_DIR=./storage/calidad/evidencias
CALIDAD_EVIDENCIAS_MAX_MB=10
```

`CALIDAD_EVIDENCIAS_DIR` debe apuntar a un volumen persistente y escribible en producción. En la
base de datos solo se conserva el nombre, tipo, URL, usuario y fecha de carga.

## Despliegue

1. Configura variables de entorno en el servidor.
2. `npm ci --production`
3. `npm run migrate && npm run seed` (primera vez)
4. `npm run start` (usa PM2 o systemd en producción)
