-- Personas activas que no aparecen en sync_log (por ejemplo, los datos de ejemplo
-- de 03_seed.sql en bases creadas antes de este cambio, o filas insertadas a mano).
-- Sin ese evento los dispositivos nunca las descargan. Se registra un CREATE por
-- cada una; las borradas no se registran porque ningún dispositivo las tiene.
-- Es seguro ejecutarlo varias veces: solo añade lo que falta.

INSERT INTO sync_log (table_name, record_uuid, operation)
SELECT 'personas', p.uuid, 'CREATE'
FROM personas p
LEFT JOIN sync_log sl
    ON sl.record_uuid = p.uuid
WHERE p.deleted_at IS NULL
    AND sl.change_id IS NULL
ORDER BY p.id ASC;
