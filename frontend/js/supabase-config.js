// =============================================
// Configuração do Supabase Client (Frontend)
// =============================================
// IMPORTANTE: Substitua os valores abaixo pelas suas credenciais do Supabase

const SUPABASE_URL = 'https://seu-projeto.supabase.co';
const SUPABASE_ANON_KEY = 'sua-anon-key-aqui';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
