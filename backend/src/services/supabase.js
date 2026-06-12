const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Cliente para queries de BANCO DE DADOS — service role, bypassa RLS
// NUNCA usar este cliente para signInWithPassword ou operações que mudam estado de auth
const supabaseDb = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

// Cria um cliente NOVO e isolado para cada operação de auth de usuário
// Isso evita contaminação de estado entre requisições
function createAuthClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

module.exports = { supabaseDb, createAuthClient };
