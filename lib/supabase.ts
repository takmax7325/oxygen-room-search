import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client — call this in 'use client' components
export function createBrowserSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}
