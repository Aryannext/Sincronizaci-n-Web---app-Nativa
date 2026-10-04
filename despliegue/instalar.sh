#!/bin/sh
# Primera instalación en el VPS. Se ejecuta desde la raíz del clon: sh despliegue/instalar.sh
# Después faltan dos pasos: crear los usuarios e incluir despliegue/nginx/sincronizacion.conf en Nginx (README).
set -eu
cd "$(dirname "$0")"

if [ ! -f .env ]; then
    cp .env.example .env
    chmod 600 .env
    # Los secretos se generan aquí mismo: nadie los escribe ni los ve
    sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=$(openssl rand -hex 24)|" .env
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 48)|" .env
    echo "Se creó despliegue/.env con secretos nuevos."
fi

exec sh ./aplicar.sh
