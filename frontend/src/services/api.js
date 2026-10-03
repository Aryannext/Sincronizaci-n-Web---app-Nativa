// Se configura con VITE_API_URL en frontend/.env (ver .env.example)
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const API_ORIGIN = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
const BASE_URL = `${API_ORIGIN}/api`;

// Los ids de persona son enteros: se valida antes de usarlos en la URL
const personaUrl = (id) => {
  const personaId = Number(id);
  if (!Number.isInteger(personaId) || personaId < 1) {
    throw new Error(`Id de persona inválido: ${id}`);
  }
  return `${BASE_URL}/personas/${encodeURIComponent(personaId)}`;
};

// La sesión vive en sessionStorage: se borra al cerrar la pestaña.
// Si el navegador bloquea el almacenamiento, se mantiene solo en memoria.
const SESSION_KEY = 'syncpulse.sesion';
let sesionEnMemoria = null;

export const sesion = {
  obtener() {
    try {
      const guardada = sessionStorage.getItem(SESSION_KEY);
      if (guardada) return JSON.parse(guardada);
    } catch {
      // almacenamiento no disponible: se usa la copia en memoria
    }
    return sesionEnMemoria;
  },
  guardar(datos) {
    sesionEnMemoria = datos;
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(datos));
    } catch {
      // almacenamiento no disponible: la sesión dura lo que la página abierta
    }
  },
  cerrar() {
    sesionEnMemoria = null;
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // nada que borrar
    }
  }
};

// La app registra aquí qué hacer cuando el servidor rechaza la sesión (token caducado o revocado)
let alExpirarSesion = () => {};
export const onSesionExpirada = (callback) => {
  alExpirarSesion = callback;
};

async function handleResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data.message || (data.errors && data.errors.map(e => `${e.campo}: ${e.mensaje}`).join(', ')) || 'Error en la petición API';
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data.data;
    throw error;
  }
  return data;
}

// fetch autenticado: añade el token y cierra la sesión si el servidor responde 401
async function request(url, { body, ...opciones } = {}) {
  const token = sesion.obtener()?.token;
  const headers = {
    ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  const res = await fetch(url, {
    ...opciones,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  if (res.status === 401) {
    sesion.cerrar();
    alExpirarSesion();
  }
  return handleResponse(res);
}

export const api = {
  // Autenticación
  login: async (correo, password) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, password }),
    });
    return handleResponse(res);
  },

  // Personas
  getPersonas: () => request(`${BASE_URL}/personas`),

  getPersonaById: (id) => request(personaUrl(id)),

  createPersona: (personaData) => request(`${BASE_URL}/personas`, {
    method: 'POST',
    body: personaData,
  }),

  updatePersona: (id, personaData) => request(personaUrl(id), {
    method: 'PUT',
    body: personaData,
  }),

  deletePersona: (id) => request(personaUrl(id), {
    method: 'DELETE',
  }),

  // Sincronización e Historial
  getSyncLog: (lastChangeId = 0, limit = 100) =>
    request(`${BASE_URL}/sync?last_change_id=${lastChangeId}&limit=${limit}`),

  // Descarga todos los cambios posteriores a lastChangeId, página por página
  getSyncChangesSince: async (lastChangeId = 0, pageSize = 500) => {
    const changes = [];
    let cursor = lastChangeId;
    while (true) {
      const page = await api.getSyncLog(cursor, pageSize);
      const pageChanges = page.changes || [];
      changes.push(...pageChanges);
      cursor = page.last_change_id;
      if (pageChanges.length < pageSize) break;
    }
    return { changes, last_change_id: cursor };
  },

  // Verificación de estado de conexión al backend
  checkHealth: async () => {
    try {
      const res = await fetch(`${API_ORIGIN}/`);
      return res.ok;
    } catch {
      return false;
    }
  }
};
