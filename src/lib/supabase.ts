// Supabase temporarily disabled
export const supabase = null;
export const supabaseAdmin = null;
export function getSupabase() {
  throw new Error('Supabase not configured');
}
