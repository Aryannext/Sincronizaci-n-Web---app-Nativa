## Qué cambia y por qué

<!-- Describe el problema y la solución en pocas líneas. Si cierra un issue: "Cierra #123". -->

## Cómo lo probaste

<!-- Comandos ejecutados, casos probados a mano, capturas si cambia la interfaz. -->

- [ ] `cd backend && npm test` pasa
- [ ] `cd frontend && npm run lint -- --deny-warnings && npm run build` pasa
- [ ] Añadí o actualicé tests para el cambio (o explico abajo por qué no hacen falta)

## Documentación

Marca lo que aplique. Si algo no aplica, déjalo sin marcar.

- [ ] **`docs/api.md`**: cambió un endpoint, parámetro, cuerpo, respuesta, código de error o permiso por rol
- [ ] **`docs/documento.md`** y sus **diagramas Mermaid**: cambió el flujo de sincronización, la arquitectura o los estados del móvil
- [ ] **Diagrama del `README.md`**: cambió algún componente o la forma en que se comunican
- [ ] **`README.md`**: cambió la instalación, los comandos o el despliegue
- [ ] **`.env.example`**: hay variables de entorno nuevas o distintas
- [ ] **Migración SQL nueva** en `backend/src/database/` (numerada, que se pueda ejecutar varias veces) y añadida al orden del README y a `MIGRACIONES` en `backend/test/helpers/entorno.js`

## Impacto en la app Android

- [ ] Este cambio **no** afecta al contrato con la app móvil
- [ ] Este cambio **sí** afecta a la app móvil (explica qué debe adaptarse)
