import { type SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import { requirePublicEnv } from './env';

let browserClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  // Create a singleton in the browser.
  if (typeof window === 'undefined') {
    throw new Error('Supabase client requested on the server.');
  }

  if (!browserClient) {
    const env = requirePublicEnv();
    // IMPORTANT: use cookie-based auth storage so server route handlers can read sessions.
    browserClient = createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }

  return browserClient;
}
