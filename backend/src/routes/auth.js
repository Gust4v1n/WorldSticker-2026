const express = require('express');
const router = express.Router();
const { supabaseDb, createAuthClient } = require('../services/supabase');
const authMiddleware = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // 1. Criar usuário usando a API Admin (bypassa verificação de email)
    const { data: authData, error: authError } = await supabaseDb.auth.admin.createUser({
      email,
      password,
      email_confirm: true // <-- Isso força o email a estar confirmado automaticamente!
    });

    if (authError) throw authError;

    // 2. Criar perfil usando supabaseDb (service role bypassa RLS)
    if (authData.user) {
      const { error: profileError } = await supabaseDb
        .from('profiles')
        .insert([{
          id: authData.user.id,
          username,
        }]);

      if (profileError) {
        console.error('Erro ao criar perfil:', profileError);
        // Deletar o usuário no Auth para não ficar "órfão"
        await supabaseDb.auth.admin.deleteUser(authData.user.id);
        throw new Error('Nome de usuário indisponível ou erro ao criar perfil.');
      }
    }

    // 3. Fazer login automático para gerar o token JWT
    //    USAR CLIENTE ISOLADO para não contaminar o estado do supabaseDb
    const authClient = createAuthClient();
    const { data: sessionData, error: sessionError } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (sessionError) throw sessionError;

    res.status(201).json({ 
      message: 'Conta criada com sucesso', 
      user: sessionData.user,
      token: sessionData.session.access_token 
    });
  } catch (err) {
    console.error('Erro no cadastro:', err);
    res.status(500).json({ error: err.message || 'Erro ao registrar usuário' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // USAR CLIENTE ISOLADO para signInWithPassword
    // Isso evita contaminar o supabaseDb que é usado para queries de banco
    const authClient = createAuthClient();
    const { data, error } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Retorna o token para o frontend
    res.json({
      token: data.session.access_token,
      user: data.user
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(401).json({ error: err.message || 'Credenciais inválidas' });
  }
});

// GET /api/auth/me — Retorna o perfil do usuário atual
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { data: profile, error } = await supabaseDb
      .from('profiles')
      .select('*')
      .eq('id', req.userId)
      .single();

    if (error) throw error;
    res.json(profile);
  } catch (err) {
    console.error('Erro ao buscar perfil:', err);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

module.exports = router;
