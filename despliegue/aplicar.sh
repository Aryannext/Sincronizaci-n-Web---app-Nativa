#!/bin/sh
# Construye las imágenes, aplica las migraciones y levanta los contenedores.
# La usan instalar.sh y desplegar.sh; se separa para que, tras un git pull, corra siempre la versión nueva.
set -eu
cd "$(dirname "$0")"

docker compose build
# Primero la base: las migraciones deben estar aplicadas antes de que arranque la API nueva
docker compose up -d --wait db
sh ./migrar.sh
# --wait espera a que api y web pasen su healthcheck; si no, el despliegue falla aquí
docker compose up -d --wait
echo "Listo: https://proyectosena.online/sincronizacion/"
