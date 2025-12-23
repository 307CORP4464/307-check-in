import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Don't create client at module load time!
let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  // Only create the client when first requested
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase environment variables missing');
      throw new Error('Supabase not configured');
    }

    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }

  return supabaseInstance;
}

// Export a safe default that doesn't initialize immediately
export const supabase = {
  get instance() {
    return getSupabase();
  }
};

export const supabaseAdmin = null;
