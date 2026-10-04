# Panel web compilado + proxy hacia la API. Se construye desde la raíz del repositorio (ver docker-compose.yml)
FROM node:22-alpine AS compilacion

WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend ./
# El panel vive bajo una ruta del dominio (/sincronizacion/) y llama a la API por esa misma ruta
ARG VITE_BASE=/sincronizacion/
ARG VITE_API_URL=https://proyectosena.online/sincronizacion
RUN VITE_BASE="$VITE_BASE" VITE_API_URL="$VITE_API_URL" npm run build

FROM nginx:1.27-alpine
COPY despliegue/nginx/web.conf /etc/nginx/conf.d/default.conf
COPY --from=compilacion /app/dist /usr/share/nginx/html
