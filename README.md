# Sincronización Web & App Nativa (Offline-First Architecture)

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Android](https://img.shields.io/badge/Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)
![Kotlin](https://img.shields.io/badge/Kotlin-0095D5?style=for-the-badge&logo=kotlin&logoColor=white)

Una plataforma completa e integral de **Sincronización Offline-First** diseñada para conectar aplicaciones móviles nativas Android (en terreno o zonas sin cobertura) con un backend robusto en **Node.js / PostgreSQL** y un Centro de Mando administrativo en **React + Vite**.

---

## Arquitectura y Flujo de Sincronización

El sistema utiliza un protocolo de **Sincronización Asíncrona (Push & Pull)** respaldado por una tabla de auditoría (`sync_log`) y borrado lógico (*Soft Delete*):

```mermaid
graph TD
    subgraph Movil [Cliente Android Nativo - Terreno]
        UI[App Interfaz Kotlin] -->|CRU / Offline| ROOM[(SQLite / Room DB)]
        ROOM -->|Estado: PENDING| COLA[Cola de Sincronizacion]
        WORKER[WorkManager / NetworkMonitor]
    end

    subgraph Servidor [Backend Node.js & PostgreSQL]
        API[Express REST API - /api/sync & /api/personas]
        PG[(PostgreSQL DB)]
        LOG[(Tabla sync_log)]
        API -->|1. Transaccion SQL| PG
        API -->|2. Registro de Cambio| LOG
    end

    subgraph Web [Centro de Mando React - Oficina]
        DASH[Dashboard & KPIs]
        CRUD[Gestion de Personas Real-Time]
        FEED[Monitor Sync Live Feed]
    end

    WORKER -->|Detecta Wi-Fi / Datos| COLA
    COLA -->|PUSH: Subir Cambios Pendientes| API
    COLA -->|PULL: GET /sync?last_change_id=X| API
    LOG -->|Feed en Vivo / Auditoria| FEED
    PG -->|Consulta Online| DASH & CRUD
```

---

## Características Principales

### 1. Cliente Android Nativo (Offline-First)
- **Persistencia Local:** Almacenamiento seguro en **SQLite / Room** sin depender de conexión a internet.
- **Sincronización Automática:** Uso de **WorkManager** para detectar la restauración de la red (Wi-Fi/Datos) y disparar tareas en segundo plano.
- **Resolución de Conflictos:** Control de versiones basado en `uuid` y campo `version`.

### 2. Backend Node.js + Express + PostgreSQL
- **Borrado Lógico (Soft Delete):** Ningún registro se destruye físicamente. Al eliminar, se asigna fecha a `deleted_at`, preservando la integridad referencial para los dispositivos fuera de línea.
- **Historial Incremental (`sync_log`):** Cada operación (`CREATE`, `UPDATE`, `DELETE`) genera un evento inmutable con un `change_id` secuencial para sincronizaciones ultrarrápidas (*Pull*).
- **Validaciones & Seguridad:** Protección de endpoints con `express-validator` y manejo de CORS para clientes móviles/locales.

### 3. Centro de Mando Web (React + Vite + Lucide)
- **Diseño Glassmorphism Premium:** Interfaz moderna en Modo Oscuro con paneles translúcidos y micro-animaciones.
- **Monitor de Sincronización en Vivo:** Línea de tiempo interactiva (*Timeline*) que permite inspeccionar el payload JSON exacto de los eventos que entran desde los móviles.
- **Gestión de Papelera:** Módulo dedicado para auditar y administrar los registros eliminados por borrado lógico.

---

## Estructura del Proyecto

```text
├── android/          # Código fuente e interfaz nativa Android (Kotlin + Room)
├── backend/          # API REST (Node.js, Express, PostgreSQL, pg)
│   ├── src/
│   │   ├── controllers/  # Controladores (Personas y Sincronización)
│   │   ├── database/     # Scripts SQL y esquemas de tablas
│   │   ├── routes/       # Definición de endpoints (/api/personas, /api/sync)
│   │   └── services/     # Lógica de negocio y registro de Sync Log
│   └── docs/             # Documentación técnica de la API y flujos
└── frontend/         # Web App Administrativa (React 19 + Vite + Lucide Icons)
    └── src/
        ├── components/   # Vistas: Dashboard, Personas, Monitor Sync, Papelera
        └── services/     # Cliente de conexión API REST
```

---

## Guía de Inicio Rápido (Desarrollo Local)

### 1. Requisitos Previos
- [Node.js](https://nodejs.org/) (v18 o superior)
- [PostgreSQL](https://www.postgresql.org/) (v14 o superior)
- [Android Studio](https://developer.android.com/studio) (Para el cliente móvil)

### 2. Configurar y Ejecutar el Backend
```bash
cd backend
npm install

# Configurar variables de entorno (Crear archivo .env)
cp .env.example .env  # Configura PostgreSQL y JWT_SECRET en .env

# Generar un JWT_SECRET (cópialo en .env; sin él el servidor no arranca)
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# Iniciar servidor en modo desarrollo (Puerto 3000)
npm run dev
```

Crea la base de datos ejecutando **en orden** los scripts de `backend/src/database/`: `01_create_database.sql`, `02_create_tables.sql`, `03_seed.sql`, `04_add_version_column.sql`, `05_create_usuarios.sql` y `06_correo_unico_activos.sql`. Los scripts 04, 05 y 06 también sirven para actualizar una base ya existente.

#### Crear usuarios
No existe registro público: los usuarios se crean desde la consola del servidor. La contraseña se pide por teclado (mínimo 10 caracteres).
```bash
# Administrador del panel web
npm run crear-usuario -- --correo admin@tuempresa.com --nombre "Ana Admin" --rol admin

# Un operador por cada dispositivo o persona en terreno
npm run crear-usuario -- --correo tablet1@tuempresa.com --nombre "Tablet 1" --rol operador

# Cambiar la contraseña / reactivar
npm run crear-usuario -- --correo tablet1@tuempresa.com --actualizar

# Revocar el acceso (ej. dispositivo perdido): sus sesiones dejan de funcionar al momento
npm run crear-usuario -- --correo tablet1@tuempresa.com --desactivar
```

| Rol | Uso | Acceso |
|-----|-----|--------|
| `admin` | Panel web | Todo: `/api/personas`, `/api/sync`, `/api/sync/push` |
| `operador` | App Android | Solo sincronización: `/api/sync` y `/api/sync/push` |

### 3. Configurar y Ejecutar la Web App (Frontend)
```bash
cd frontend
npm install

# Opcional: cambiar la URL del backend (por defecto http://localhost:3000)
cp .env.example .env

# Iniciar servidor local de Vite (Puerto 5173)
npm run dev
```
Abre tu navegador en: `http://localhost:5173/`

Inicia sesión con un usuario `admin`.

### 4. Conectar el Teléfono o Emulador Android
1. Asegúrate de que tu PC y tu teléfono móvil estén en la **misma red Wi-Fi**.
2. Configura la IP de tu servidor (ej. `http://192.168.X.X:3000`) en el archivo de configuración del cliente móvil (`network_security_config.xml` y `PersonaApi.kt`).
3. La app debe iniciar sesión con un usuario `operador` (`POST /api/auth/login`) y enviar el token en cada petición. Ver [docs/api.md](docs/api.md#autenticación).

---

## Despliegue en Internet

La API maneja datos personales, así que en Internet **solo debe servirse por HTTPS**. Node no gestiona los certificados: se pone un proxy delante (Caddy, Nginx o el del hosting) que termina HTTPS y reenvía a la API.

1. En el `.env` del servidor:
   - `HOST=127.0.0.1`: solo el proxy puede llegar a la API.
   - `TRUST_PROXY=1`: para que el límite de peticiones vea la IP real del cliente.
   - `CORS_ORIGINS=https://panel.tuempresa.com`: el dominio del panel web.
   - Un `JWT_SECRET` propio de producción, distinto al de desarrollo.
2. Ejemplo con [Caddy](https://caddyserver.com/), que obtiene y renueva el certificado solo:
   ```
   api.tuempresa.com {
       reverse_proxy 127.0.0.1:3000
   }
   ```
3. Compila el panel con `VITE_API_URL=https://api.tuempresa.com npm run build` y publica la carpeta `frontend/dist` en `panel.tuempresa.com`.
4. En la app Android usa la URL `https://` y elimina cualquier excepción de tráfico en claro (`cleartextTrafficPermitted`) de `network_security_config.xml`.

---

## Documentación API
Puedes consultar la documentación completa de endpoints, parámetros y estructuras de respuesta en:
[Documentación de la API REST](docs/api.md)

---
*Desarrollado con arquitectura Offline-First para máxima resiliencia en terreno y control administrativo en tiempo real.*
