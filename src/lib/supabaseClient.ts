import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requirePublicEnv } from './env';

let browserClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  // Create a singleton in the browser.
  if (typeof window === 'undefined') {
    // Server-side usage isn't supported in this MVP.
    // (When we need it, we'll add @supabase/ssr and server-only keys.)
    throw new Error('Supabase client requested on the server.');
  }

  if (!browserClient) {
    const env = requirePublicEnv();
    browserClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }

  return browserClient;
}
