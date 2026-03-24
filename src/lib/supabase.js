import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseConfigError = null;

if (!supabaseUrl || !supabaseAnonKey) {
  supabaseConfigError =
    'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (Anon public API key) in your environment.';
}

if (!supabaseConfigError) {
  try {
    const parsed = new URL(supabaseUrl);
    if (!/^https?:$/.test(parsed.protocol)) {
      supabaseConfigError = 'Invalid Supabase URL format. It should start with http:// or https://';
    }
  } catch (_error) {
    supabaseConfigError = 'Invalid Supabase URL format. It should start with http:// or https://';
  }
}

if (!supabaseConfigError) {
  if (typeof supabaseAnonKey !== 'string' || supabaseAnonKey.trim().length < 100) {
    supabaseConfigError = 'Supabase key appears to be missing or invalid. Provide the full anon public key from Supabase.';
  }
}

export const supabase = supabaseConfigError ? null : createClient(supabaseUrl, supabaseAnonKey);
export { supabaseConfigError };
