// =============================================
// Configuração do Supabase Client (Frontend)
// =============================================
// IMPORTANTE: Substitua os valores abaixo pelas suas credenciais do Supabase

const SUPABASE_URL = 'https://udjdvymonfacddlesgxu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkamR2eW1vbmZhY2RkbGVzZ3h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMzMxMDMsImV4cCI6MjA5NjgwOTEwM30._PB8PgF0CBRm0GplD0GSgEkxloBC1371jV-Lm26HaVc';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
