const BASE_URL = 'http://localhost:3000/api';

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

  // Verificación de estado de conexión al backend
  checkHealth: async () => {
    try {
      const res = await fetch(`http://localhost:3000/`);
      return res.ok;
    } catch {
      return false;
    }
  }
};
