/**
 * Backend connection settings, read from Vite env variables at build time:
 *
 *   VITE_API_URL                   Hillman Centrale API (e.g. http://localhost:3000)
 *   VITE_SUPABASE_URL              Supabase project URL (sign-in)
 *   VITE_SUPABASE_PUBLISHABLE_KEY  Supabase publishable key (public by design)
 *
 * When all three are set the app runs against the backend ("API mode"). When any is missing it keeps the
 * in-memory demo data (mock mode), so the static demo build keeps working.
 */
const env = (import.meta.env ?? {}) as Record<string, string | undefined>
const clean = (v: string | undefined) => (v ?? '').trim().replace(/\/+$/, '')

export const API_URL = clean(env.VITE_API_URL)
export const SUPABASE_URL = clean(env.VITE_SUPABASE_URL)
export const SUPABASE_KEY = (env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim()

/** True when the app talks to the backend instead of the demo data. */
export const API_MODE = !!(API_URL && SUPABASE_URL && SUPABASE_KEY)
