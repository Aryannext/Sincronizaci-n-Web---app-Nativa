# Documentación Técnica: Sistema de Sincronización Offline-First

Esta aplicación utiliza una estrategia **Offline-First**. Esto significa que la aplicación siempre interactúa primero con una base de datos local y sincroniza los cambios con el servidor de forma asíncrona cuando hay conexión a internet o red local.

---

> **Alcance del repositorio:** aquí están el backend (Node.js + PostgreSQL) y el panel web (React). La app Android (Kotlin + Room) no forma parte de este repositorio; las secciones sobre Android describen cómo debe integrarse con la API. El contrato exacto está en [api.md](api.md).

## 1. Visión General de la Arquitectura
El sistema utiliza una arquitectura de **Tres Capas** diseñada para funcionar sin conexión a internet de forma indefinida y sincronizarse automáticamente al detectar red:

- **Cliente (Android):** Utiliza **Jetpack Compose** para la interfaz de usuario (UI), **Room** como base de datos relacional local (SQLite) y **WorkManager** para la programación y ejecución de tareas de sincronización en segundo plano.
- **Servidor (API REST):** Backend construido en **Node.js + Express** que actúa como validador de reglas de negocio, gestor de historiales de cambio (`sync_log`) y puente hacia la base de datos central.
- **Base de Datos (PostgreSQL):** El *"Single Source of Truth"* (Fuente única de verdad) donde residen los datos finales, versiones y el estado consolidado de todos los usuarios.
- **Centro de Mando Web (React + Vite):** Cliente administrativo en oficina que permite monitorear las sincronizaciones en tiempo real, auditar eventos y gestionar la base de datos de forma online.

### Diagrama de Arquitectura del Sistema
```mermaid
graph TD
    subgraph Capa_Movil [Cliente Android Nativo - Campo]
        UI[Jetpack Compose UI] -->|Lectura / Escritura| REPO[PersonaRepository]
        REPO -->|Persistencia SQLite| ROOM[(Room DB Local)]
        ROOM -->|Tareas pendientes con uuid y base_version| COLA[Tabla pending_changes]
        WM[WorkManager / NetworkMonitor] -->|Escucha estado de red| COLA
        TOKEN[Token del operador en EncryptedSharedPreferences]
    end

    subgraph Capa_Servidor [Backend Node.js & API REST - HTTPS en produccion]
        API[Express API - Puerto 3000]
        SEG[CORS, helmet y limite de peticiones]
        AUTH[Autenticacion JWT y roles]
        VAL[express-validator & Error Middleware]
        API --> SEG --> AUTH --> VAL
    end

    subgraph Capa_Datos [Base de Datos Central - PostgreSQL]
        PG[(Tabla personas)]
        LOG[(Tabla sync_log)]
        USR[(Tabla usuarios)]
        AUTH -->|Verifica usuario activo| USR
        VAL -->|Transaccion SQL con control de version| PG
        VAL -->|Auditoria con usuario| LOG
    end

    subgraph Capa_Administrativa [Centro de Mando - Oficina]
        WEB[React + Vite Web App - login admin] -->|HTTPS + token| API
    end

    WM -->|PUSH: POST /sync/push + token| API
    WM -->|PULL: GET /sync + token| API
    TOKEN -.->|Authorization: Bearer| WM
    API -->|Personas, papelera y feed de sync_log| WEB
```

---

## 2. Configuración de Conexión (Local y Producción)

### Desarrollo en red local
Para que un dispositivo Android (móvil físico o emulador) alcance el servidor en tu PC (ejemplo de red: `192.168.40.5`):

1. **Nivel de API (Android):** En `PersonaApi.kt`, `BASE_URL` apunta a la IP privada de tu computadora (ej: `http://192.168.40.5:3000/api/`).
2. **Nivel de Seguridad (Android):** En `network_security_config.xml` se autoriza el tráfico *cleartext* (HTTP sin cifrar) **solo para esa IP de desarrollo**.
3. **Nivel de Servidor (Node.js):** Con `HOST=0.0.0.0` en el `.env`, Express acepta conexiones de otros dispositivos de la red y no solo de `localhost`.

### Producción (Internet)
- La API se sirve **solo por HTTPS** detrás de un proxy (Caddy, Nginx…), con `HOST=127.0.0.1` y `TRUST_PROXY=1`. Ver "Despliegue en Internet" en el README.
- En la app se usa la URL `https://` y se **elimina** la excepción de tráfico en claro.
- CORS solo admite los orígenes de `CORS_ORIGINS` (el dominio del panel web). La app nativa no envía `Origin`, así que no le afecta.

### Autenticación
Toda petición, salvo el login, requiere `Authorization: Bearer <token>`. La app inicia sesión con un usuario de rol **operador** (`POST /api/auth/login`), guarda el token en `EncryptedSharedPreferences` y lo añade con un interceptor de Retrofit. El token dura 30 días.

---

## 3. El Modelo de Datos y Estados de Sync
Para rastrear el ciclo de vida de cada registro sin conexión, la entidad `Persona` en la base de datos local Room cuenta con una propiedad vital llamada `syncStatus`:

- **`SYNCED`:** El dato local está perfectamente alineado e idéntico a la versión almacenada en el servidor PostgreSQL.
- **`PENDING_INSERT`:** Persona creada localmente en el móvil sin conexión a internet. Está lista para ser empujada en el próximo ciclo Push.
- **`PENDING_UPDATE`:** Persona editada localmente en el móvil; el servidor PostgreSQL aún posee una versión anterior del registro.
- **`PENDING_DELETE`:** Persona marcada por el usuario para eliminar; el registro se mantiene en Room con una fecha en `deletedAt` hasta que el servidor reciba la notificación y confirme el borrado lógico.

### Diagrama de Ciclo de Vida del Estado de Sincronización (`syncStatus`)
```mermaid
stateDiagram-v2
    [*] --> PENDING_INSERT: Creacion offline en terreno
    PENDING_INSERT --> SYNCED: Push applied o duplicate

    SYNCED --> PENDING_UPDATE: Edicion local en movil
    PENDING_UPDATE --> SYNCED: Push applied
    PENDING_UPDATE --> SYNCED: Push conflict, se toma la version del servidor

    SYNCED --> PENDING_DELETE: Eliminacion local por usuario
    PENDING_DELETE --> [*]: Push applied y borrado en Room
    PENDING_DELETE --> SYNCED: Push conflict, el registro cambio en el servidor
```

---

## 4. Lógica de Sincronización (Paso a Paso)
La sincronización se divide en dos flujos complementarios: **Push** (Enviar cambios locales al servidor) y **Pull** (Descargar novedades remotas al móvil).

### A. El Repositorio (`PersonaRepository.kt`)
Actúa como el director de orquesta entre Room y Retrofit. Cuando el usuario pulsa el botón *"Guardar"* en la interfaz gráfica:
1. **Escribe en Room:** Guarda de forma inmediata el objeto en la base de datos SQLite local asignándole el estado `PENDING_INSERT` (o `PENDING_UPDATE`).
2. **Registra el Cambio:** Inserta una fila en la tabla de cola local `pending_changes` especificando el `uuid` del registro y el tipo de operación. Esta tabla funciona como una memoria transaccional de lo que debe enviarse al servidor.
3. **Intento Inmediato:** Llama al método `tryToSyncPush()`.
   - *Si hay internet:* Envía los datos instantáneamente a la API REST Node.js y actualiza el estado a `SYNCED`.
   - *Si NO hay internet:* Captura la excepción de red de forma silenciosa; la tarea queda guardada en `pending_changes` sin interrumpir la experiencia del usuario.

### B. El Worker de Fondo (`SyncWorker.kt`)
Utiliza la librería oficial **Android WorkManager** para garantizar la ejecución en segundo plano.
- **Configuración de Restricciones:** Se encola con la restricción de red obligatoria: `.setRequiredNetworkType(NetworkType.CONNECTED)`.
- **Activación Automática:** El sistema operativo Android monitorea los adaptadores de red y despierta este Worker exactamente en el instante en que el móvil recupera la conectividad Wi-Fi o Datos Celulares.
- **Proceso de Ejecución:**
  1. Ejecuta primero `tryToSyncPush()` para vaciar la tabla `pending_changes` y subir todas las creaciones, ediciones o borrados pendientes.
  2. Ejecuta inmediatamente después `syncPull()`, consultando el endpoint `GET /api/sync?last_change_id=X` para descargar las novedades que otros usuarios o administradores web hayan realizado.

### C. Estrategia de Conflicto y Resolución
Para evitar duplicados, colisiones de IDs y pérdida de información en entornos concurrentes:
- **El `uuid` lo genera el móvil** al crear el registro offline y nunca cambia. Si un `CREATE` se reenvía (por ejemplo, porque se perdió la respuesta), el servidor responde `duplicate` y no crea otra fila.
- **Control de versiones optimista en el PUSH:** cada `UPDATE` y `DELETE` lleva la `base_version` que el móvil conocía. Si alguien cambió el registro antes, el servidor **no aplica nada** y responde `conflict` con la versión actual (`server`). La app reemplaza su copia local por la del servidor, o se la muestra al usuario para que decida y reenvíe.
- **PULL:** al descargar cambios, el DAO de Room aplica cada registro por `uuid` solo si su `version` es mayor que la local. Una persona restaurada desde la papelera llega como `UPDATE` con `deleted_at: null` y se vuelve a insertar.

### Diagrama de Secuencia: Flujo Transaccional Push & Pull
```mermaid
sequenceDiagram
    autonumber
    actor Usuario as Operador en Terreno
    participant UI as Jetpack Compose UI
    participant Room as Room SQLite Local
    participant Worker as WorkManager (SyncWorker)
    participant API as Node.js Express API
    participant PG as PostgreSQL DB

    Note over Usuario, Room: Fase 1: Operacion Offline en Terreno
    Usuario->>UI: Crea o edita registro
    UI->>Room: Guarda Persona (syncStatus = PENDING_INSERT)
    Room->>Room: Inserta en tabla pending_changes

    Note over Worker, PG: Fase 2: Restauracion de Red y Sincronizacion PUSH
    Worker->>Worker: Detecta conexion Wi-Fi / Datos
    Worker->>Room: Lee tareas de pending_changes
    Worker->>API: POST /api/sync/push (lote con uuid y base_version, token Bearer)
    API->>API: Valida token, rol y cada operacion
    API->>PG: Por operacion: transaccion SQL (cambio en personas + sync_log)
    PG-->>API: Confirmacion o version distinta
    API-->>Worker: HTTP 200 OK (estado por operacion: applied / duplicate / conflict...)
    Worker->>Room: Aplica cada resultado y limpia pending_changes

    Note over Worker, PG: Fase 3: Sincronizacion Incremental PULL
    Worker->>API: GET /api/sync?last_change_id=X
    API->>PG: SELECT * FROM sync_log WHERE change_id > X
    PG-->>API: Devuelve eventos transaccionales
    API-->>Worker: HTTP 200 OK (Lista de cambios remotos)
    Worker->>Room: upsertSync (Compara UUID y version para evitar conflictos)
```

---

## 5. Flujo de Datos Completo (De Terreno a Base de Datos)
El ciclo de vida transaccional sigue estos 6 pasos secuenciales:

1. **Creación Offline:** El usuario en terreno crea una Persona en la app Android -> Se guarda en **Room** con `syncStatus = PENDING_INSERT` -> Se inserta la tarea en la tabla `pending_changes`.
2. **Detección de Red:** El móvil recupera cobertura o se conecta al Wi-Fi -> El sistema operativo despierta al **SyncWorker**.
3. **Fase Push:** El SyncWorker lee la cola `pending_changes` -> Envía el lote a `POST /api/sync/push` con el token del operador. Cada operación lleva su `uuid` y, en ediciones y borrados, la `base_version`.
4. **Procesamiento en Backend:** Node.js valida el token y cada operación -> Aplica cada una en su propia transacción en **PostgreSQL** y escribe su fila de auditoría en `sync_log`, con el usuario que la hizo.
5. **Respuesta Confirmada:** Node.js responde `200 OK` con un estado por operación: `applied`, `duplicate`, `conflict`, `not_found`, `invalid` o `rejected`, junto con el registro resultante (incluida su `version`).
6. **Cierre de Ciclo en Móvil:** El móvil guarda en Room cada registro devuelto -> Marca `syncStatus = SYNCED` -> Elimina de `pending_changes` las operaciones resueltas. Qué hacer en cada estado está en [api.md](api.md).

---

## 6. Manejo de Errores y Resiliencia
- **Servidor Caído o Inaccesible:** Si el dispositivo móvil tiene internet activo pero tu PC o servidor Node.js está apagado, la llamada de Retrofit lanza una excepción. El `SyncWorker` la captura y retorna `Result.retry()`. WorkManager reprogramará automáticamente el intento aplicando una política de *Backoff Exponencial* (esperando 1 minuto, luego 2, 4, 8, etc.), evitando saturar la red o gastar batería.
- **Sesión Caducada o Revocada (`401`):** El SyncWorker **no borra** la cola `pending_changes`: pausa la sincronización, pide al usuario que inicie sesión de nuevo y reintenta después. Los reintentos son seguros: gracias al `uuid` y a `base_version` nada se aplica dos veces.
- **Sobrevivencia al Cierre de la App:** Si el usuario cierra la aplicación deslizándola de las tareas recientes o apaga la pantalla justo mientras se está sincronizando, no hay pérdida de datos. WorkManager opera como un servicio del sistema del kernel de Android y completará la sincronización en segundo plano de manera totalmente independiente a la interfaz gráfica.

---

## 7. Centro de Mando Web (Complemento Administrativo)
Mientras el cliente Android está optimizado para trabajadores en terreno (*Offline-First*), la aplicación web en **React + Vite** ofrece el control total en oficina:
- **Monitor de Sincronización en Vivo:** Escucha y visualiza la tabla `sync_log`, mostrando en una línea de tiempo (*Timeline*) cada evento `CREATE`, `UPDATE` o `DELETE` que los móviles empujan al servidor.
- **Inspector de Eventos:** Permite hacer clic en cualquier evento del historial para ver su detalle en JSON: operación, fecha, usuario que lo hizo y el **estado actual** del registro afectado (no una copia del momento del cambio).
- **Papelera de Reciclaje (Borrado Lógico):** Muestra todos los registros donde `deleted_at IS NOT NULL` y permite **restaurarlos**. Un correo de una persona en la papelera se puede volver a usar.
- **Acceso:** Solo usuarios con rol **admin** (login con correo y contraseña).

---

## 8. Guía de Verificación y Mantenimiento
1. **Verificar IP Local (solo desarrollo):** Si cambias de red Wi-Fi o de enrutador, la IP privada de tu PC podría cambiar. Actualiza `BASE_URL` en `PersonaApi.kt` y la excepción de `network_security_config.xml`.
2. **Inspeccionar Logs de Sincronización:** En Android Studio, abre la pestaña **Logcat** y filtra por las etiquetas `PersonaRepository` o `SyncWorker` para observar el flujo de peticiones HTTP en tiempo real.
3. **Gestionar Accesos:** Para dar de alta un dispositivo, crea un usuario operador con `npm run crear-usuario`. Si se pierde un dispositivo, desactívalo con `--desactivar`: su sesión deja de funcionar al momento.
4. **Verificar Estado del Backend:** Asegúrate de que tu servidor Node.js esté ejecutándose (`npm run dev` en la carpeta `backend/`) y que el Firewall de Windows permita el tráfico entrante al puerto `3000`.

*Esta arquitectura sólida garantiza que el usuario en terreno jamás pierda información valiosa, permitiéndole operar en zonas rurales o sin señal con la certeza de que todo su trabajo se sincronizará de forma invisible y segura al recuperar la conectividad.*
