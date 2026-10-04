#!/bin/sh
# Despliega lo último de main en el VPS: sh despliegue/desplegar.sh
set -eu
cd "$(dirname "$0")/.."

git pull --ff-only origin main
# exec carga aplicar.sh ya actualizado por el pull
exec sh despliegue/aplicar.sh
