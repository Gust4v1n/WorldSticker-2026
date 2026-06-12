const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Cliente com service role key — bypassa RLS para operações administrativas
const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = supabase;
