// =============================================
// Autenticação — Login, Cadastro, Logout
// =============================================

/**
 * Verifica se o usuário está autenticado e redireciona se necessário
 */
async function checkAuth(redirectTo = 'index.html') {
  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    window.location.href = redirectTo;
    return null;
  }

  return data.session.user;
}

/**
 * Verifica se já está logado (para páginas de login/registro)
 */
async function redirectIfLoggedIn(redirectTo = 'album.html') {
  const { data } = await supabase.auth.getSession();

  if (data.session) {
    window.location.href = redirectTo;
  }
}

/**
 * Login com email e senha
 */
async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Cadastro com email, senha e username
 */
async function register(email, password, username) {
  // 1. Criar conta no Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  // 2. Criar perfil na tabela profiles
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: data.user.id,
        username: username,
      }]);

    if (profileError) {
      console.error('Erro ao criar perfil:', profileError);
      throw profileError;
    }
  }

  return data;
}

/**
 * Logout
 */
async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  window.location.href = 'index.html';
}

/**
 * Retorna dados do perfil do usuário atual
 */
async function getCurrentProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}
