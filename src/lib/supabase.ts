import { createClient } from '@supabase/supabase-js';

// No MVP, as credenciais vêm do .env gerado pelo Vite.
// Certifique-se de configurar o arquivo .env com essas chaves!
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'sua-url-supabase';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sua-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
