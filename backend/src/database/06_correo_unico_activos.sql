-- El correo solo debe ser único entre personas activas: el de una persona borrada
-- (en la papelera) se puede volver a usar. Para bases creadas con la restricción
-- UNIQUE original. Es seguro ejecutarlo varias veces.

ALTER TABLE personas
    DROP CONSTRAINT IF EXISTS personas_correo_key;

CREATE UNIQUE INDEX IF NOT EXISTS personas_correo_activo_idx
    ON personas (correo)
    WHERE deleted_at IS NULL;
