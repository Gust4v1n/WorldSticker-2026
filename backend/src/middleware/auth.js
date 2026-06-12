const { supabaseDb } = require('../services/supabase');

/**
 * Middleware de autenticação
 * Verifica o token JWT do Supabase enviado no header Authorization
 * e injeta req.userId com o ID do usuário autenticado.
 */
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticação não fornecido' });
    }

    const token = authHeader.split(' ')[1];

    // Usa supabaseDb (service role) para verificar o token
    const { data, error } = await supabaseDb.auth.getUser(token);

    if (error || !data.user) {
      console.error('❌ Token inválido:', error?.message);
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    req.userId = data.user.id;
    req.userEmail = data.user.email;
    next();
  } catch (err) {
    console.error('Erro no middleware de autenticação:', err);
    return res.status(500).json({ error: 'Erro interno de autenticação' });
  }
}

module.exports = authMiddleware;
