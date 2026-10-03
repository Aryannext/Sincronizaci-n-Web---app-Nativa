// Se configura con VITE_API_URL en frontend/.env (ver .env.example)
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const API_ORIGIN = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
const BASE_URL = `${API_ORIGIN}/api`;

async function handleResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data.message || (data.errors && data.errors.map(e => `${e.campo}: ${e.mensaje}`).join(', ')) || 'Error en la petición API';
    throw new Error(errorMsg);
  }
  return data;
}

export const api = {
  // Personas
  getPersonas: async () => {
    const res = await fetch(`${BASE_URL}/personas`);
    return handleResponse(res);
  },

  getPersonaById: async (id) => {
    const res = await fetch(`${BASE_URL}/personas/${id}`);
    return handleResponse(res);
  },

  createPersona: async (personaData) => {
    const res = await fetch(`${BASE_URL}/personas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(personaData),
    });
    return handleResponse(res);
  },

  updatePersona: async (id, personaData) => {
    const res = await fetch(`${BASE_URL}/personas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(personaData),
    });
    return handleResponse(res);
  },

  deletePersona: async (id) => {
    const res = await fetch(`${BASE_URL}/personas/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  // Sincronización e Historial
  getSyncLog: async (lastChangeId = 0, limit = 100) => {
    const res = await fetch(`${BASE_URL}/sync?last_change_id=${lastChangeId}&limit=${limit}`);
    return handleResponse(res);
  },

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
