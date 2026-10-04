#!/bin/sh
# Aplica el esquema y las migraciones de backend/src/database a la base del contenedor db.
# Base nueva: 02 (esquema) y 03 (datos de ejemplo). Siempre: de la 04 en adelante, que se pueden repetir.
# 01_create_database.sql no se usa: la base la crea el contenedor con DB_NAME.
set -eu
cd "$(dirname "$0")"

psql_db() {
    # Usuario y base salen de las variables del propio contenedor; -1 aplica cada archivo en una transacción
    docker compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -q -1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
}

existe=$(docker compose exec -T db sh -c 'psql -tA -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
SELECT to_regclass('public.personas') IS NOT NULL;
SQL
)

if [ "$existe" != "t" ]; then
    echo "Base nueva: creando el esquema y los datos de ejemplo."
    psql_db < ../backend/src/database/02_create_tables.sql
    psql_db < ../backend/src/database/03_seed.sql
fi

for archivo in ../backend/src/database/*.sql; do
    case "$(basename "$archivo")" in
        01_*|02_*|03_*) continue ;;
        *) ;;
    esac
    echo "Migración: $(basename "$archivo")"
    psql_db < "$archivo"
done
