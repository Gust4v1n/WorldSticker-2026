// =============================================
// API Wrapper — Chamadas ao Backend Express
// =============================================

// Em produção (Vercel), usa URL relativa. Em dev local, usa localhost:3001
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001/api' 
  : '/api';

/**
 * Retorna o token JWT do usuário autenticado no Supabase
 */
async function getAuthToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

/**
 * Faz uma requisição autenticada ao backend
 */
async function apiRequest(endpoint, options = {}) {
  const token = await getAuthToken();

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro na requisição');
    }

    return data;
  } catch (error) {
    console.error(`Erro em ${endpoint}:`, error);
    throw error;
  }
}

// =============================================
// API de Figurinhas (Catálogo)
// =============================================
const stickersApi = {
  list: () => apiRequest('/stickers'),
  get: (id) => apiRequest(`/stickers/${id}`),
  create: (data) => apiRequest('/stickers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiRequest(`/stickers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiRequest(`/stickers/${id}`, { method: 'DELETE' }),
};

// =============================================
// API de Coleção do Usuário
// =============================================
const userStickersApi = {
  list: () => apiRequest('/user-stickers'),
  duplicates: () => apiRequest('/user-stickers/duplicates'),
  openPack: () => apiRequest('/user-stickers/open-pack', { method: 'POST' }),
  paste: (id) => apiRequest(`/user-stickers/${id}/paste`, { method: 'PATCH' }),
};

// =============================================
// API de Trocas
// =============================================
const tradesApi = {
  list: () => apiRequest('/trades'),
  my: () => apiRequest('/trades/my'),
  create: (data) => apiRequest('/trades', { method: 'POST', body: JSON.stringify(data) }),
  accept: (id) => apiRequest(`/trades/${id}/accept`, { method: 'PATCH' }),
  reject: (id) => apiRequest(`/trades/${id}/reject`, { method: 'PATCH' }),
  cancel: (id) => apiRequest(`/trades/${id}`, { method: 'DELETE' }),
};
