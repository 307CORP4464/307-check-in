// Supabase client disabled
export const supabase = null;
export const supabaseAdmin = null;
export function getSupabase(): any {
  throw new Error('Supabase not configured');
}
