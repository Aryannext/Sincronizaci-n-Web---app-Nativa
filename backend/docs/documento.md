# Documentación del Sistema de Sincronización Offline
Esta aplicación utiliza una estrategia Offline-First. Esto significa que la aplicación siempre interactúa primero con una base de datos local y sincroniza los cambios con el servidor de forma asíncrona cuando hay conexión.
1. Arquitectura de Conexión
Componentes:
•
Frontend: Android (Kotlin, Room, Retrofit, WorkManager).
•
Backend: Node.js + Express (Escuchando en 0.0.0.0).
•
Base de Datos: PostgreSQL (Servidor) y Room (Local).
Configuración de Red:
Para que el dispositivo Android (móvil físico o emulador) se comunique con la API local, se configuró lo siguiente:
•
IP del Servidor: 192.168.40.5 (Puerto 3000).
•
Network Security: Se habilitó el tráfico de texto plano (HTTP) en app/src/main/res/xml/network_security_config.xml para permitir conexiones a IPs locales.
•
CORS: El servidor Node.js tiene habilitado el middleware cors() para aceptar peticiones desde el origen de la aplicación móvil.
2. Funcionamiento de la Sincronización
La sincronización se divide en dos flujos: Push (Enviar) y Pull (Traer).
A. Flujo de Escritura (Push - Del Móvil al Servidor)
1.
Guardado Local: Cuando creas o editas una persona, se guarda en la base de datos Room con un estado: PENDING_INSERT, PENDING_UPDATE o PENDING_DELETE.
2.
Registro de Cambios: Se inserta una entrada en la tabla pending_changes con el UUID de la persona y la operación realizada.
3.
Disparo de Sync: Se llama a PersonaRepository.tryToSyncPush().
◦
Si hay internet: Se envía inmediatamente a la API.
◦
Si NO hay internet: Los datos permanecen en Room. El WorkManager reintentará la operación automáticamente cuando detecte conexión.
4.
Confirmación: Una vez que la API responde exitosamente (200 OK), el estado de la persona en Room cambia a SYNCED y se elimina de la tabla de cambios pendientes.
B. Flujo de Lectura (Pull - Del Servidor al Móvil)
1.
Sincronización Incremental: La app envía al servidor el last_change_id (el ID del último cambio que conoce).
2.
Descarga: El servidor responde con una lista de cambios ocurridos desde ese ID.
3.
Upsert (Update/Insert): El PersonaDao utiliza una lógica de conflicto: si el version del dato que viene del servidor es mayor al local, se actualiza el registro local.
3. Clases Clave
•
PersonaDao.kt: Contiene la lógica de persistencia y manejo de transacciones para asegurar que los datos no se corrompan.
•
PersonaRepository.kt: Coordina las llamadas entre la base de datos local y la API. Es el punto de entrada para todas las operaciones de datos.
•
PersonaApi.kt: Interfaz de Retrofit donde se define la BASE_URL y los endpoints.
•
SyncWorker.kt: Tarea en segundo plano gestionada por Android que garantiza que la sincronización ocurra incluso si la aplicación se cierra.
Creating Documentation
4. Cómo probar/mantener el sistema
The user requested documentation on the implementation and how the synchronization works. I will create a comprehensive guide covering the architecture, configuration, and sync logic.
1.
Verificar IP: Si cambias de red Wi-Fi, la IP de tu PC podría cambiar. Debes actualizar BASE_URL en PersonaApi.kt y la IP en network_security_config.xml.
2.
Logs de Sincronización: En Android Studio, abre la pestaña Logcat y filtra por la etiqueta PersonaRepository o SyncWorker para ver el estado de las peticiones en tiempo real.
3.
Estado del Servidor: Asegúrate de que tu servidor Node.js esté corriendo con npm run dev y que no haya firewalls bloqueando el puerto 3000.
Esta estructura garantiza que el usuario nunca pierda información, permitiéndole trabajar en zonas sin cobertura y sincronizando todo el trabajo automáticamente al recuperar la señal.