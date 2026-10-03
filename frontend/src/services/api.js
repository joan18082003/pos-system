// Usamos una ruta relativa porque Vite está configurado como proxy en vite.config.js.
// Así, las peticiones van al mismo dominio/puerto del frontend, evitando problemas
// de CORS y autenticación en túneles de VS Code.
export const API_URL = '/api';

export const api = {
  API_URL: '/api',
  // Autenticación y Registro
  getAuthStatus: async () => {
    const res = await fetch(`${API_URL}/auth/status`);
    if (!res.ok) throw new Error('Error al consultar estado del sistema');
    return res.json();
  },
  registerUser: async (userData) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al registrar usuario');
    }
    return res.json();
  },

  // Productos
  getProducts: async (token) => {
    const res = await fetch(`${API_URL}/products`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Error al obtener productos');
    return res.json();
  },
  createProduct: async (productData, token) => {
    const res = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(productData),
    });
    if (!res.ok) throw new Error('Error al crear producto');
    return res.json();
  },
  deleteProduct: async (id, token) => {
    const res = await fetch(`${API_URL}/products/${id}`, { 
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Error al eliminar producto');
    return res.json();
  },

  // Ventas
  createSale: async (saleData, token) => {
    const res = await fetch(`${API_URL}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(saleData),
    });
    if (!res.ok) throw new Error('Error al procesar la venta');
    return res.json();
  },

  // Categorías
  getCategories: async (token) => {
    const res = await fetch(`${API_URL}/categories`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Error al obtener categorías');
    return res.json();
  },

  // Dashboard
  getDailyReport: async (token) => {
    const res = await fetch(`${API_URL}/dashboard/report`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) throw new Error('Error al obtener reporte del día');
    return res.json();
  },
  getStagnantProducts: async (token) => {
    const res = await fetch(`${API_URL}/dashboard/stagnant`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) throw new Error('Error al obtener productos estancados');
    return res.json();
  },
  getReplenishmentList: async (token) => {
    const res = await fetch(`${API_URL}/dashboard/replenishment`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) throw new Error('Error al obtener lista de reposición');
    return res.json();
  },
  getTodayClosure: async (token) => {
    const res = await fetch(`${API_URL}/dashboard/closure/today`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) throw new Error('Error al consultar cierre de hoy');
    return res.json();
  },
  getClosureHistory: async (token) => {
    const res = await fetch(`${API_URL}/dashboard/closures`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) throw new Error('Error al consultar historial de cierres');
    return res.json();
  },
  performDailyClosure: async (token) => {
    const res = await fetch(`${API_URL}/dashboard/close-day`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Error al ejecutar cierre diario');
    }
    return res.json();
  },
  getSetting: async (key, token) => {
    const res = await fetch(`${API_URL}/dashboard/settings/${key}`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) throw new Error('Error al obtener configuración');
    return res.json();
  },
  updateSetting: async (key, value, token) => {
    const res = await fetch(`${API_URL}/dashboard/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) throw new Error('Error al actualizar configuración');
    return res.json();
  }
};
