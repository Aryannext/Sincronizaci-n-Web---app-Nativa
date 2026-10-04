# API de sincronización. Se construye desde la raíz del repositorio (ver docker-compose.yml)
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY backend/src ./src
COPY backend/scripts ./scripts

# El proceso no corre como root
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]
