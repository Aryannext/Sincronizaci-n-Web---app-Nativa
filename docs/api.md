# API REST - Sistema de Sincronización Offline-First (CRUD)

## 📋 Descripción General
Esta especificación técnica documenta la API REST del backend en **Node.js + Express + PostgreSQL**. Actúa como servidor de validación, fuente única de verdad (*Single Source of Truth*) y motor de sincronización asíncrona para clientes móviles nativos (**Android / Kotlin**) y el Centro de Mando Web (**React + Vite**).

### Características Clave del Backend:
- **Identificadores Universales (`uuid`):** Generados en el móvil o en el servidor para evitar colisiones de claves primarias en modo offline.
- **Control de Versiones (`version`):** Número de revisión de cada dato utilizado para resolver conflictos (Estrategia de *Upsert*).
- **Borrado Lógico (*Soft Delete*):** Los registros eliminados no se destruyen físicamente; se estampan con `deleted_at` para propagar el borrado a todos los dispositivos sincronizados.
- **Auditoría Incremental (`sync_log`):** Cada transacción (`CREATE`, `UPDATE`, `DELETE`) genera un evento inmutable con ID secuencial (`change_id`) para descargas ultrarrápidas en móvil.

---

## 🌐 URLs Base y Configuración de Red
El servidor Node.js se ejecuta vinculando explícitamente la interfaz `0.0.0.0` en el puerto `3000` (`app.listen(3000, "0.0.0.0")`), permitiendo conexiones entrantes de emuladores y teléfonos físicos en la red local Wi-Fi.

- **Desarrollo en PC local (Web / Postman):**
  `http://localhost:3000/api`
- **Conexión en Red Local / Móvil Android (IP Privada):**
  `http://192.168.40.5:3000/api` *(Ejemplo de IP local configurada en `network_security_config.xml`)*

### Headers Requeridos
Todas las peticiones HTTP con carga útil deben especificar el tipo de contenido:
```http
Content-Type: application/json
```

---

## 👥 Módulo Persona (Modelo de Datos)
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

# 🚀 Endpoints de Personas (CRUD Online)

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
    "correo": "juancarlos@gmail.com"
}
```

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

# 🔄 Endpoints de Sincronización Offline (PULL)

## 1. Descargar Historial de Cambios (`GET /sync`)
Punto de entrada principal para la sincronización PULL de clientes nativos Android y monitoreo web. Consulta la tabla `sync_log` devolviendo todos los eventos posteriores al último ID conocido por el cliente.

- **Método:** `GET`
- **Ruta:** `/sync`
- **Parámetros de Consulta (`Query Params`):**

| Parámetro | Tipo | Obligatorio | Por Defecto | Descripción |
|-----------|------|-------------|-------------|-------------|
| `last_change_id` | Entero | No | `0` | ID del último cambio procesado localmente por el dispositivo. |
| `limit` | Entero | No | `100` | Cantidad máxima de eventos a descargar en este lote. |

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

# ⚠️ Respuestas de Error Estándar

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
Devuelto por PostgreSQL cuando se intenta insertar o modificar una persona utilizando un correo electrónico que ya existe en la base de datos (incluso si pertenece a un registro eliminado con borrado lógico si no se ha aplicado índice condicional).
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

## 📊 Códigos de Estado HTTP Utilizados

| Código | Estado | Uso en la API |
|:------:|:-------|:--------------|
| **200** | `OK` | Consulta exitosa (`GET`) o modificación realizada (`PUT`, `DELETE`). |
| **201** | `Created` | Registro insertado correctamente en la base de datos (`POST`). |
| **400** | `Bad Request` | Falla en las reglas de validación de entradas de `express-validator`. |
| **404** | `Not Found` | El ID solicitado no existe o ya fue eliminado lógicamente. |
| **409** | `Conflict` | Violación de restricción única en la base de datos (Correo duplicado). |
| **500** | `Internal Error` | Excepción no controlada o fallo de conexión con PostgreSQL. |
