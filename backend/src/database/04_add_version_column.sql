-- Solo para bases creadas antes de que 02_create_tables.sql incluyera la columna version.
-- Es seguro ejecutarlo varias veces.
ALTER TABLE personas
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
