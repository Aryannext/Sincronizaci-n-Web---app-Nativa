# API REST - Offline Sync CRUD

## Descripción
Esta API REST permite administrar el módulo de personas con soporte nativo para **Sincronización Offline (Offline-First)** mediante un registro de historial de cambios (`sync_log`).

Está desarrollada con:
- Node.js
- Express
- PostgreSQL

La comunicación se realiza mediante JSON.

# URL Base
http://localhost:3000/api

# Headers
Todas las peticiones que envían información deben incluir:

Content-Type: application/json

# Módulo Persona
Cada registro en PostgreSQL cuenta con identificadores únicos universales (`uuid`) y control de versiones (`version`) para resolver conflictos en entornos sin conexión.

```json
{
    "id": 1,
    "uuid": "c39a8c12-3a5f-4d98-8e3b-112233445566",
    "nombre": "Cristian",
    "apellido": "Cantillo",
    "telefono": "3001234567",
    "correo": "cristian@gmail.com",
    "created_at": "2026-07-02T05:00:00.000Z",
    "updated_at": "2026-07-02T05:00:00.000Z",
    "deleted_at": null,
    "version": 1
}
```

---

# Endpoints de Personas

## 1. Obtener todas las personas (Activas)
Devuelve únicamente los registros que no han sido eliminados (`deleted_at IS NULL`).

### Método
GET

### Endpoint
/personas

### Ejemplo
GET http://localhost:3000/api/personas

### Respuesta
```json
[
    {
        "id": 1,
        "uuid": "c39a8c12-3a5f-4d98-8e3b-112233445566",
        "nombre": "Cristian",
        "apellido": "Cantillo",
        "telefono": "3001234567",
        "correo": "cristian@gmail.com",
        "created_at": "2026-07-02T05:00:00.000Z",
        "updated_at": "2026-07-02T05:00:00.000Z",
        "deleted_at": null,
        "version": 1
    },
    {
        "id": 2,
        "uuid": "8f1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
        "nombre": "Juan",
        "apellido": "Perez",
        "telefono": "3001112233",
        "correo": "juan@gmail.com",
        "created_at": "2026-07-02T05:10:00.000Z",
        "updated_at": "2026-07-02T05:10:00.000Z",
        "deleted_at": null,
        "version": 1
    }
]
```

### Código HTTP
200 OK

---

## 2. Obtener una persona por ID
### Método
GET

### Endpoint
/personas/:id

### Ejemplo
GET http://localhost:3000/api/personas/1

### Respuesta
```json
{
    "id": 1,
    "uuid": "c39a8c12-3a5f-4d98-8e3b-112233445566",
    "nombre": "Cristian",
    "apellido": "Cantillo",
    "telefono": "3001234567",
    "correo": "cristian@gmail.com",
    "created_at": "2026-07-02T05:00:00.000Z",
    "updated_at": "2026-07-02T05:00:00.000Z",
    "deleted_at": null,
    "version": 1
}
```

### Si no existe
```json
{
    "success": false,
    "message": "Persona no encontrada"
}
```

### Código HTTP
200 OK
404 Not Found

---

## 3. Crear una persona
Al crear una persona, el servidor genera automáticamente su `uuid`, inicializa `version` en 1 y registra un evento `CREATE` en la tabla `sync_log`.

### Método
POST

### Endpoint
/personas

### Ejemplo
POST http://localhost:3000/api/personas

### Body
```json
{
    "nombre": "Juan",
    "apellido": "Perez",
    "telefono": "3001112233",
    "correo": "juan@gmail.com"
}
```

### Respuesta
```json
{
    "id": 2,
    "uuid": "8f1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
    "nombre": "Juan",
    "apellido": "Perez",
    "telefono": "3001112233",
    "correo": "juan@gmail.com",
    "created_at": "2026-07-02T05:10:00.000Z",
    "updated_at": "2026-07-02T05:10:00.000Z",
    "deleted_at": null,
    "version": 1
}
```

### Código HTTP
201 Created
400 Bad Request (Error de validación)
409 Conflict (Correo duplicado)

---

## 4. Actualizar una persona
Incrementa automáticamente el campo `version` en 1 y registra un evento `UPDATE` en la tabla `sync_log`.

### Método
PUT

### Endpoint
/personas/:id

### Ejemplo
PUT http://localhost:3000/api/personas/2

### Body
```json
{
    "nombre": "Juan Carlos",
    "apellido": "Perez",
    "telefono": "3119998888",
    "correo": "juancarlos@gmail.com"
}
```

### Respuesta
```json
{
    "id": 2,
    "uuid": "8f1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
    "nombre": "Juan Carlos",
    "apellido": "Perez",
    "telefono": "3119998888",
    "correo": "juancarlos@gmail.com",
    "created_at": "2026-07-02T05:10:00.000Z",
    "updated_at": "2026-07-02T05:15:00.000Z",
    "deleted_at": null,
    "version": 2
}
```

### Código HTTP
200 OK
404 Not Found

---

## 5. Eliminar una persona (Borrado Lógico / Soft Delete)
No elimina físicamente el registro de la base de datos. Asigna la fecha actual al campo `deleted_at`, incrementa `version` en 1 y registra un evento `DELETE` en la tabla `sync_log` para que las apps móviles sepan qué registros eliminar en su almacenamiento local.

### Método
DELETE

### Endpoint
/personas/:id

### Ejemplo
DELETE http://localhost:3000/api/personas/2

### Respuesta
```json
{
    "id": 2,
    "uuid": "8f1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
    "nombre": "Juan Carlos",
    "apellido": "Perez",
    "telefono": "3119998888",
    "correo": "juancarlos@gmail.com",
    "created_at": "2026-07-02T05:10:00.000Z",
    "updated_at": "2026-07-02T05:20:00.000Z",
    "deleted_at": "2026-07-02T05:20:00.000Z",
    "version": 3
}
```

### Código HTTP
200 OK
404 Not Found

---

# Endpoints de Sincronización Offline

## 1. Obtener historial de cambios (PULL Sync)
Permite a las aplicaciones móviles (Android/iOS) descargar los cambios incrementales desde la última sincronización.

### Método
GET

### Endpoint
/sync

### Parámetros de Consulta (Query Params)
| Parámetro | Tipo | Obligatorio | Valor por defecto | Descripción |
|-----------|------|-------------|-------------------|-------------|
| `last_change_id` | Número | No | 0 | ID del último cambio procesado por el dispositivo local. |
| `limit` | Número | No | 100 | Cantidad máxima de cambios a devolver. |

### Ejemplo
GET http://localhost:3000/api/sync?last_change_id=0&limit=100

### Respuesta
```json
{
    "last_change_id": 3,
    "changes": [
        {
            "change_id": "1",
            "table_name": "personas",
            "record_uuid": "c39a8c12-3a5f-4d98-8e3b-112233445566",
            "operation": "CREATE",
            "created_at": "2026-07-02T05:00:00.000Z",
            "data": {
                "uuid": "c39a8c12-3a5f-4d98-8e3b-112233445566",
                "nombre": "Cristian",
                "apellido": "Cantillo",
                "telefono": "3001234567",
                "correo": "cristian@gmail.com",
                "version": 1,
                "deleted_at": null
            }
        },
        {
            "change_id": "3",
            "table_name": "personas",
            "record_uuid": "8f1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
            "operation": "DELETE",
            "created_at": "2026-07-02T05:20:00.000Z",
            "data": {
                "uuid": "8f1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
                "nombre": "Juan Carlos",
                "apellido": "Perez",
                "telefono": "3119998888",
                "correo": "juancarlos@gmail.com",
                "version": 3,
                "deleted_at": "2026-07-02T05:20:00.000Z"
            }
        }
    ]
}
```

### Código HTTP
200 OK

---

# Respuestas de Error Comunes

## Error de Validación (400 Bad Request)
Se devuelve cuando los campos obligatorios faltan o no cumplen con los formatos válidos en `POST` y `PUT`.
```json
{
    "success": false,
    "message": "Error de validación.",
    "errors": [
        {
            "campo": "correo",
            "mensaje": "El correo no es válido."
        }
    ]
}
```

## Conflicto por Correo Duplicado (409 Conflict)
Se devuelve cuando se intenta registrar una persona con un correo electrónico que ya existe en la base de datos.
```json
{
    "success": false,
    "message": "El correo ya está registrado."
}
```

---

# Códigos de estado HTTP
| Código | Descripción |
|---------|-------------|
| 200 | Operación exitosa |
| 201 | Recurso creado exitosamente |
| 400 | Error de validación en la solicitud |
| 404 | Recurso no encontrado |
| 409 | Conflicto (Ej: Correo duplicado) |
| 500 | Error interno del servidor |

---

# Arquitectura
Cliente (Móvil / Web)
    │
    ▼
Routes (`/personas`, `/sync`)
    │
    ▼
Controllers
    │
    ▼
Services + Sync Log
    │
    ▼
PostgreSQL

# Tecnologías
- Node.js + Express (API REST)
- PostgreSQL + driver `pg`
- express-validator (Validación de datos)
- dotenv + cors

# Estado actual
- CRUD de Personas completo (listo en backend)
- PostgreSQL y Borrado Lógico integrados (listo en backend)
- Sincronización Offline y Cola de Historial (`sync_log`) funcionales (listo en backend)
- Clientes móviles y web (en desarrollo)

