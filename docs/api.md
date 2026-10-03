# API REST - Sistema de Sincronización Offline-First (CRUD)

## Descripción General
Esta especificación técnica documenta la API REST del backend en **Node.js + Express + PostgreSQL**. Actúa como servidor de validación, fuente única de verdad (*Single Source of Truth*) y motor de sincronización asíncrona para clientes móviles nativos (**Android / Kotlin**) y el Centro de Mando Web (**React + Vite**).

### Características Clave del Backend:
- **Identificadores Universales (`uuid`):** Generados en el móvil o en el servidor para evitar colisiones de claves primarias en modo offline.
- **Control de Versiones (`version`):** Número de revisión de cada dato utilizado para resolver conflictos (Estrategia de *Upsert*).
- **Borrado Lógico (*Soft Delete*):** Los registros eliminados no se destruyen físicamente; se estampan con `deleted_at` para propagar el borrado a todos los dispositivos sincronizados.
- **Auditoría Incremental (`sync_log`):** Cada transacción (`CREATE`, `UPDATE`, `DELETE`) genera un evento inmutable con ID secuencial (`change_id`) para descargas ultrarrápidas en móvil.

---

## URLs Base y Configuración de Red
El servidor Node.js se ejecuta vinculando explícitamente la interfaz `0.0.0.0` en el puerto `3000` (`app.listen(3000, "0.0.0.0")`), permitiendo conexiones entrantes de emuladores y teléfonos físicos en la red local Wi-Fi.

- **Desarrollo en PC local (Web / Postman):**
  `http://localhost:3000/api`
- **Conexión en Red Local / Móvil Android (IP Privada):**
  `http://192.168.40.5:3000/api` *(Ejemplo de IP local configurada en `network_security_config.xml`)*

En producción la API se sirve **solo por HTTPS** detrás de un proxy (ver "Despliegue en Internet" en el README).

### Headers Requeridos
Todas las peticiones HTTP con carga útil deben especificar el tipo de contenido, y todas las rutas excepto `GET /` y `POST /auth/login` requieren el token de sesión:
```http
Content-Type: application/json
Authorization: Bearer <token>
```

---

# Autenticación

Los usuarios se crean desde la consola del servidor (`npm run crear-usuario`); no existe registro público.

| Rol | Cliente | Rutas permitidas | Duración del token |
|-----|---------|------------------|--------------------|
| `admin` | Panel web | Todas | 8 horas (`JWT_EXPIRES_ADMIN`) |
| `operador` | App Android | `GET /sync`, `POST /sync/push` | 30 días (`JWT_EXPIRES_OPERADOR`) |

## Iniciar Sesión (`POST /auth/login`)
- **Límite:** 10 intentos fallidos cada 15 minutos por IP (`429` al superarlo). Los inicios de sesión correctos no cuentan.
- El correo no distingue mayúsculas. Un correo inexistente y una contraseña incorrecta devuelven el mismo `401`, para no revelar qué correos están registrados.

### Cuerpo de la Petición (`Body`)
```json
{
    "correo": "tablet1@tuempresa.com",
    "password": "contraseña-del-usuario"
}
```

### Respuesta Exitosa (`200 OK`)
```json
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…",
    "usuario": {
        "id": 2,
        "correo": "tablet1@tuempresa.com",
        "nombre": "Tablet 1",
        "rol": "operador",
        "activo": true
    }
}
```

### Credenciales Incorrectas (`401 Unauthorized`)
```json
{
    "success": false,
    "message": "Correo o contraseña incorrectos."
}
```

## Usuario Actual (`GET /auth/me`)
Devuelve el usuario dueño del token. Sirve para comprobar si la sesión sigue activa.

## Ciclo de Vida de la Sesión
- El token se envía en `Authorization: Bearer <token>` en cada petición.
- En cada petición el servidor comprueba que el usuario siga **activo**. Si se desactiva (`npm run crear-usuario -- --correo … --desactivar`), sus tokens dejan de funcionar al momento, sin esperar a que caduquen.
- Ante un `401` el cliente debe borrar el token y pedir de nuevo el inicio de sesión. Un `403` significa que el rol no tiene permiso para esa ruta.

### Guía para la App Android
1. Guardar el token en `EncryptedSharedPreferences`, nunca la contraseña.
2. Añadir la cabecera con un interceptor de OkHttp/Retrofit.
3. Si `/sync/push` o `/sync` responden `401`, **no borrar la cola local de cambios**: pausar la sincronización, pedir al usuario que inicie sesión y reintentar después.
4. El token dura 30 días: un dispositivo que pase más tiempo sin conexión tendrá que iniciar sesión de nuevo.

---

## Módulo Persona (Modelo de Datos)
Representación JSON de un registro de Persona que circula en la API:

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

# Endpoints de Personas (CRUD Online)

## 1. Obtener todas las personas activas
Devuelve la lista de registros activos. Aplica automáticamente el filtro `WHERE deleted_at IS NULL` para excluir los eliminados lógicamente.

- **Método:** `GET`
- **Ruta:** `/personas`
- **Ejemplo:** `GET http://192.168.40.5:3000/api/personas`

### Respuesta Exitosa (`200 OK`)
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

---

## 2. Obtener una persona por ID
Busca un registro individual activo por su clave primaria.

- **Método:** `GET`
- **Ruta:** `/personas/:id`
- **Ejemplo:** `GET http://192.168.40.5:3000/api/personas/1`

### Respuesta Exitosa (`200 OK`)
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

### Respuesta si no existe (`404 Not Found`)
```json
{
    "success": false,
    "message": "Persona no encontrada"
}
```

---

## 3. Crear una persona (o Sincronizar PUSH Insert)
Crea una nueva persona en PostgreSQL. El servidor genera el `uuid` (si no se envía), inicializa `version = 1` y dispara un evento `CREATE` en la tabla `sync_log`.

- **Método:** `POST`
- **Ruta:** `/personas`
- **Ejemplo:** `POST http://192.168.40.5:3000/api/personas`

### Cuerpo de la Petición (`Body`)
```json
{
    "nombre": "Juan",
    "apellido": "Perez",
    "telefono": "3001112233",
    "correo": "juan@gmail.com"
}
```

### Respuesta Exitosa (`201 Created`)
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

---

## 4. Actualizar una persona (o Sincronizar PUSH Update)
Modifica los datos de una persona activa. Incrementa el campo `version` en 1 y dispara un evento `UPDATE` en la tabla `sync_log`.

- **Método:** `PUT`
- **Ruta:** `/personas/:id`
- **Ejemplo:** `PUT http://192.168.40.5:3000/api/personas/2`

### Cuerpo de la Petición (`Body`)
```json
{
    "nombre": "Juan Carlos",
    "apellido": "Perez",
    "telefono": "3119998888",
    "correo": "juancarlos@gmail.com",
    "version": 1
}
```

`version` es opcional. Si se envía, el cambio solo se aplica cuando coincide con la versión actual del servidor (control de concurrencia optimista). El panel web siempre la envía. Los dispositivos móviles deben usar `POST /sync/push`.

### Respuesta Exitosa (`200 OK`)
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

### Conflicto de Versión (`409 Conflict`)
Otro usuario o dispositivo modificó el registro después de que el cliente lo leyó. No se aplica ningún cambio y `data` trae la versión actual para que el usuario decida.
```json
{
    "success": false,
    "message": "El registro fue modificado por otro usuario o dispositivo. Vuelve a abrirlo para ver la versión actual.",
    "data": {
        "id": 2,
        "uuid": "8f1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
        "nombre": "Juan Carlos",
        "apellido": "Perez",
        "telefono": "3157770000",
        "correo": "juancarlos@gmail.com",
        "created_at": "2026-07-02T05:10:00.000Z",
        "updated_at": "2026-07-02T05:18:00.000Z",
        "deleted_at": null,
        "version": 3
    }
}
```

---

## 5. Eliminar una persona (Borrado Lógico / Soft Delete)
No destruye el registro físicamente en PostgreSQL. Escribe la marca de tiempo en `deleted_at`, incrementa `version` y registra el evento `DELETE` en `sync_log` para que los dispositivos offline sepan que deben removerlo de sus bases de datos locales al reconectarse.

- **Método:** `DELETE`
- **Ruta:** `/personas/:id`
- **Ejemplo:** `DELETE http://192.168.40.5:3000/api/personas/2`

### Respuesta Exitosa (`200 OK`)
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

---

## 6. Ver la Papelera (`GET /personas/eliminadas`)
Lista las personas con borrado lógico (`deleted_at` con fecha), las más recientes primero. Mismo formato que `GET /personas`.

- **Método:** `GET`
- **Ruta:** `/personas/eliminadas`
- **Rol:** `admin`

---

## 7. Restaurar una persona (`POST /personas/:id/restaurar`)
Saca a una persona de la papelera: pone `deleted_at` en `null`, incrementa `version` y registra un evento **`UPDATE`** en `sync_log`. Los dispositivos lo reciben en el siguiente pull como un registro con `deleted_at: null` y una versión mayor, y lo vuelven a insertar sin necesitar un tipo de operación nuevo.

- **Método:** `POST`
- **Ruta:** `/personas/:id/restaurar`
- **Rol:** `admin`

### Cuerpo de la Petición (`Body`, opcional)
```json
{
    "version": 3
}
```
Si se envía `version` y no coincide con la del servidor, no se restaura y se responde `409` con el registro actual en `data` (igual que en `PUT`).

### Respuesta Exitosa (`200 OK`)
El registro restaurado, con `deleted_at: null` y la nueva `version`.

### Errores
| Código | Motivo |
|--------|--------|
| `404` | No existe una persona con ese `id`. |
| `409` | La persona no está en la papelera, la `version` no coincide, o **otra persona activa ya usa su correo**: "No se puede restaurar: otra persona activa ya usa ese correo." |

> **Unicidad del correo:** el correo solo debe ser único entre personas **activas**. El de una persona en la papelera se puede volver a usar para otra; en ese caso, la persona borrada no se puede restaurar hasta que se cambie o borre la otra.

---

# Endpoints de Sincronización Offline (PULL)

## 1. Descargar Historial de Cambios (`GET /sync`)
Punto de entrada principal para la sincronización PULL de clientes nativos Android y monitoreo web. Consulta la tabla `sync_log` devolviendo todos los eventos posteriores al último ID conocido por el cliente.

- **Método:** `GET`
- **Ruta:** `/sync`
- **Parámetros de Consulta (`Query Params`):**

| Parámetro | Tipo | Obligatorio | Por Defecto | Descripción |
|-----------|------|-------------|-------------|-------------|
| `last_change_id` | Entero | No | `0` | ID del último cambio procesado localmente por el dispositivo. |
| `limit` | Entero | No | `100` | Cantidad máxima de eventos a descargar en este lote (entre 1 y 1000). |

- **Ejemplo:** `GET http://192.168.40.5:3000/api/sync?last_change_id=0&limit=100`

### Respuesta Exitosa (`200 OK`)
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

---

# Endpoint de Sincronización Offline (PUSH)

## 2. Subir la Cola de Cambios Pendientes (`POST /sync/push`)
El dispositivo envía en un solo lote los cambios que guardó sin conexión. El servidor los aplica **en el orden recibido** y devuelve un resultado por cada operación. Una operación que falle no bloquea las demás.

- **Método:** `POST`
- **Ruta:** `/sync/push`
- **Máximo:** 200 operaciones por lote (si hay más, se envían en varios lotes).
- **Ejemplo:** `POST http://192.168.40.5:3000/api/sync/push`

### Cuerpo de la Petición (`Body`)
```json
{
    "operations": [
        {
            "op": "CREATE",
            "uuid": "c39a8c12-3a5f-4d98-8e3b-112233445566",
            "data": { "nombre": "Laura", "apellido": "Gomez", "telefono": "3001234500", "correo": "laura@example.com" }
        },
        {
            "op": "UPDATE",
            "uuid": "8f1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
            "base_version": 3,
            "data": { "nombre": "Juan", "apellido": "Perez", "telefono": "3119998888", "correo": "juan@gmail.com" }
        },
        {
            "op": "DELETE",
            "uuid": "0b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e",
            "base_version": 2
        }
    ]
}
```

| Campo | Obligatorio en | Descripción |
|-------|----------------|-------------|
| `op` | Todas | `CREATE`, `UPDATE` o `DELETE`. |
| `uuid` | Todas | UUID del registro. En `CREATE` lo **genera el dispositivo** (UUID v4) al guardar offline y nunca cambia. |
| `base_version` | `UPDATE`, `DELETE` | Versión del registro que el dispositivo tenía cuando el usuario hizo el cambio. |
| `data` | `CREATE`, `UPDATE` | Todos los campos de la persona (mismas reglas de validación que `POST /personas`). |

### Respuesta (`200 OK`)
```json
{
    "results": [
        { "index": 0, "op": "CREATE", "uuid": "c39a8c12-…", "status": "applied", "record": { "uuid": "c39a8c12-…", "version": 1, "…": "…" } },
        { "index": 1, "op": "UPDATE", "uuid": "8f1a2b3c-…", "status": "conflict", "server": { "uuid": "8f1a2b3c-…", "version": 4, "…": "…" } },
        { "index": 2, "op": "DELETE", "uuid": "0b1c2d3e-…", "status": "applied", "record": { "deleted_at": "2026-07-02T05:20:00.000Z", "version": 3, "…": "…" } }
    ]
}
```

### Estados por Operación

| `status` | Significado | Qué debe hacer el dispositivo |
|----------|-------------|-------------------------------|
| `applied` | Se aplicó. También se devuelve en reintentos de una operación que ya se había aplicado. | Guardar `record` en local (actualiza `version`) y quitar la operación de la cola. |
| `duplicate` | `CREATE` de un `uuid` que el servidor ya tiene (reintento tras perder la respuesta). | Guardar `record` en local y quitar la operación de la cola. |
| `conflict` | `base_version` ya no coincide: alguien más cambió o borró el registro. No se aplicó nada. | Reemplazar la copia local por `server` (gana el servidor) o mostrar ambos al usuario para que decida y reenviar con la nueva `base_version`. Quitar la operación de la cola. |
| `not_found` | `UPDATE`/`DELETE` de un `uuid` que el servidor no conoce. | Revisar la cola: normalmente falta enviar antes su `CREATE`. |
| `invalid` | No pasó la validación. `errors` trae el detalle por campo. | Quitar de la cola y avisar al usuario: reintentar no cambiará el resultado. |
| `rejected` | La base de datos la rechazó, por ejemplo correo ya registrado. `message` explica el motivo. | Quitar de la cola y avisar al usuario para que corrija el dato. |

### Reintentos e Idempotencia
- Si la petición falla por red o responde `500`, se debe **reenviar el mismo lote sin cambios**. Gracias al `uuid` y a `base_version`, las operaciones que ya se aplicaron responden `applied` o `duplicate` y no generan duplicados.
- Un `CREATE` seguido de un `UPDATE` del mismo registro puede ir en el mismo lote (el `UPDATE` con `base_version: 1`).
- Errores del lote completo (`400`): `operations` vacío o ausente, o más de 200 operaciones.

### Flujo Recomendado en Android (WorkManager)
1. **PUSH:** enviar la cola pendiente (en lotes de hasta 200) y procesar cada resultado según la tabla anterior.
2. **PULL:** llamar a `GET /sync?last_change_id=X` hasta que llegue un lote incompleto, aplicar cada cambio en Room por `uuid` (si `data.version` es mayor que la local) y guardar el nuevo `last_change_id`.

---

# Respuestas de Error Estándar

## Error de Validación (`400 Bad Request`)
Devuelto por `express-validator` cuando se omiten campos obligatorios o no tienen un formato válido (ej. correo inválido o teléfono muy corto).
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

## Conflicto de Unicidad (`409 Conflict`)
Devuelto por PostgreSQL cuando se intenta crear, modificar o restaurar una persona con un correo que ya usa otra persona **activa**. Los correos de personas en la papelera no cuentan (índice único parcial `WHERE deleted_at IS NULL`).
```json
{
    "success": false,
    "message": "El correo ya está registrado."
}
```

## Error Interno del Servidor (`500 Internal Server Error`)
```json
{
    "success": false,
    "message": "Error interno del servidor."
}
```

---

## Códigos de Estado HTTP Utilizados

| Código | Estado | Uso en la API |
|:------:|:-------|:--------------|
| **200** | `OK` | Consulta exitosa (`GET`), modificación realizada (`PUT`, `DELETE`) o lote procesado (`POST /sync/push`, con un estado por operación). |
| **201** | `Created` | Registro insertado correctamente en la base de datos (`POST`). |
| **400** | `Bad Request` | Falla en las reglas de validación de entradas de `express-validator`, o JSON mal formado. |
| **401** | `Unauthorized` | Falta el token, es inválido o caducó, o el usuario fue desactivado. También: credenciales incorrectas en el login. |
| **403** | `Forbidden` | El rol del usuario no tiene permiso para la ruta, o el origen web no está en `CORS_ORIGINS`. |
| **404** | `Not Found` | El ID solicitado no existe o ya fue eliminado lógicamente. |
| **409** | `Conflict` | Correo ya usado por otra persona activa, o `version` desactualizada en `PUT /personas/:id` y al restaurar (incluye el registro actual en `data`). |
| **413** | `Payload Too Large` | El cuerpo de la petición supera 200 KB. |
| **429** | `Too Many Requests` | Se superó el límite de peticiones por IP (general, o 10 intentos fallidos de login cada 15 minutos). |
| **500** | `Internal Error` | Excepción no controlada o fallo de conexión con PostgreSQL. |
