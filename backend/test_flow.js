require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Simular exatamente o que o frontend faz no F5
(async () => {
  try {
    // 1. Login para pegar o token (como o frontend faz)
    const authClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });

    const { data: loginData, error: loginError } = await authClient.auth.signInWithPassword({
      email: 'urubu@gmail.com',
      password: 'urubu123' // você pode ajustar a senha
    });

    if (loginError) {
      console.error('Login failed:', loginError.message);
      // Tente com outra senha ou verifique
      process.exit(1);
    }

    const token = loginData.session.access_token;
    console.log('Token obtido:', token.substring(0, 30) + '...');

    // 2. Chamar a API /api/auth/me
    const meRes = await fetch('http://localhost:3001/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const me = await meRes.json();
    console.log('/api/auth/me:', JSON.stringify(me));

    // 3. Chamar a API /api/user-stickers
    const stickersRes = await fetch('http://localhost:3001/api/user-stickers', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const stickers = await stickersRes.json();
    console.log(`/api/user-stickers: ${Array.isArray(stickers) ? stickers.length : 'ERROR'} records`);
    if (stickers.error) {
      console.error('Error:', stickers.error);
    }

    // 4. Esperar 5 segundos e chamar novamente
    console.log('\nAguardando 5 segundos...');
    await new Promise(r => setTimeout(r, 5000));

    const stickersRes2 = await fetch('http://localhost:3001/api/user-stickers', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const stickers2 = await stickersRes2.json();
    console.log(`/api/user-stickers (2a vez): ${Array.isArray(stickers2) ? stickers2.length : 'ERROR'} records`);
    if (stickers2.error) {
      console.error('Error:', stickers2.error);
    }

    process.exit(0);
  } catch (err) {
    console.error('Fatal:', err);
    process.exit(1);
  }
})();
