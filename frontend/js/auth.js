// =============================================
// Autenticação — Login, Cadastro, Logout (via Backend)
// =============================================

/**
 * Verifica se o usuário está autenticado e redireciona se necessário
 */
async function checkAuth(redirectTo = 'index.html') {
  const token = localStorage.getItem('token');

  if (!token) {
    window.location.href = redirectTo;
    return null;
  }

  try {
    const profile = await getCurrentProfile();
    if (!profile) throw new Error('Sessão expirada');
    return profile;
  } catch (error) {
    localStorage.removeItem('token');
    window.location.href = redirectTo;
    return null;
  }
}

/**
 * Verifica se já está logado (para páginas de login/registro)
 */
async function redirectIfLoggedIn(redirectTo = 'album.html') {
  const token = localStorage.getItem('token');
  if (token) {
    window.location.href = redirectTo;
  }
}

/**
 * Login com email e senha via backend
 */
async function login(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro no login');

  localStorage.setItem('token', data.token);
  return data;
}

/**
 * Cadastro com email, senha e username via backend
 */
async function register(email, password, username) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, username })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro no cadastro');

  // O backend agora retorna o token logo após o cadastro
  if (data.token) {
    localStorage.setItem('token', data.token);
  }
  return data;
}

/**
 * Logout
 */
function logout() {
  localStorage.removeItem('token');
  window.location.href = 'index.html';
}

/**
 * Retorna dados do perfil do usuário atual via backend
 */
async function getCurrentProfile() {
  return await apiRequest('/auth/me');
}
