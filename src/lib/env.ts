import { z } from 'zod';

const EnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
});

/**
 * IMPORTANT:
 * - Do not parse env at module import time.
 *   Next.js may evaluate modules during build/prerender without env present.
 * - Call this at runtime (in the browser) before creating the Supabase client.
 */
export function requirePublicEnv() {
  return EnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
