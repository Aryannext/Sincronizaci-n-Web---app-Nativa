-- Datos de ejemplo. Cada persona se registra también en sync_log: los
-- dispositivos solo descargan lo que aparece en ese historial (GET /api/sync).

WITH nuevas AS (

    INSERT INTO personas (

        nombre,
        apellido,
        telefono,
        correo

    )
    VALUES

    (
        'Cristian',
        'Cantillo',
        '3001234567',
        'cristian@gmail.com'
    ),

    (
        'Juan',
        'Perez',
        '3001112233',
        'juan@gmail.com'
    )

    RETURNING id, uuid

)
INSERT INTO sync_log (table_name, record_uuid, operation)
SELECT 'personas', uuid, 'CREATE'
FROM nuevas
ORDER BY id;
