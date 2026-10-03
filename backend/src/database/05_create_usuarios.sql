-- Usuarios que pueden usar la API y registro de quién hizo cada cambio.
-- Es seguro ejecutarlo varias veces.

CREATE TABLE IF NOT EXISTS usuarios (

    id SERIAL PRIMARY KEY,

    correo VARCHAR(150) NOT NULL UNIQUE,

    nombre VARCHAR(100) NOT NULL,

    password_hash VARCHAR(100) NOT NULL,

    -- admin: panel web (todo). operador: app móvil (solo sincronización).
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'operador')),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP

);

ALTER TABLE sync_log
    ADD COLUMN IF NOT EXISTS usuario_id INTEGER NULL REFERENCES usuarios (id);
