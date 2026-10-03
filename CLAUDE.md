# Guía para asistentes de código

Sistema de sincronización offline-first: API REST en Node.js + Express + PostgreSQL (`backend/`) y panel web en React + Vite (`frontend/`). La app Android **no está en este repositorio**: su contrato con la API está en `docs/api.md`.

## Comandos

```bash
cd backend && npm test                                          # tests de integración (PostgreSQL embebido, no requiere instalación)
cd backend && npm run dev                                       # API en el puerto 3000 (necesita .env con PostgreSQL y JWT_SECRET)
cd frontend && npm run lint -- --deny-warnings && npm run build # lo mismo que ejecuta el CI
```

## Regla principal: la documentación cambia con el código

Todo cambio de comportamiento actualiza su documentación **en el mismo PR**:

| Si cambias… | Actualiza |
|---|---|
| Rutas, parámetros, cuerpos, respuestas, códigos de error o permisos (`backend/src/routes`, `controllers`, `validators`, `middleware`) | `docs/api.md` |
| Flujo de sincronización, arquitectura o estados del móvil | `docs/documento.md` y sus diagramas Mermaid |
| Componentes o cómo se comunican | Diagrama del `README.md` |
| Instalación, comandos, variables de entorno o despliegue | `README.md` y `backend/.env.example` / `frontend/.env.example` |
| Esquema de la base de datos | Nueva migración (ver abajo) y orden de scripts en el `README.md` |

Si un cambio afecta al contrato con la app Android, dilo explícitamente en el PR.

## Base de datos

- `02_create_tables.sql` describe el esquema para **instalaciones nuevas**; los cambios de esquema también se añaden como **migración nueva numerada** (`07_…sql`) para bases existentes.
- Las migraciones deben poder ejecutarse varias veces (`IF NOT EXISTS`, `DROP … IF EXISTS`).
- Toda migración nueva se añade a `MIGRACIONES` en `backend/test/helpers/entorno.js` y, si cambia un esquema existente, se prueba en `backend/test/migraciones.test.js`.
- Cada cambio en `personas` se escribe en `sync_log` en la **misma transacción**, con el `usuario_id` de quien lo hizo.

## Seguridad

- Toda ruta nueva requiere `autenticar` y `autorizar(...)` (ver `backend/src/app.js`). Solo `GET /` y `POST /api/auth/login` son públicas.
- Roles: `admin` (panel web, todo) y `operador` (app móvil, solo `/api/sync`).
- Nunca registrar datos personales ni tokens en los logs.
- SonarCloud debe pasar sin avisos de seguridad: evitar expresiones regulares con backtracking y validar todo dato externo antes de usarlo en URLs o SQL (siempre consultas parametrizadas).

## Tests

- `node:test` contra la API real; cada archivo crea su entorno con `crearEntorno()` de `backend/test/helpers/entorno.js`.
- Todo comportamiento nuevo o error corregido lleva su test.

## Estilo

- Código, interfaz, documentación y mensajes de commit en **español**.
- Backend: CommonJS, 4 espacios, sin punto y coma. Frontend: 2 espacios, con punto y coma.
- Finales de línea LF.
- Commits con prefijo convencional (`feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`, `refactor:`).
