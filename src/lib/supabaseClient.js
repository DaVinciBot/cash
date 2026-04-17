
import { createBrowserClient } from '@supabase/ssr';
import { env } from '$env/dynamic/public';
import { browser } from '$app/environment';

const publicSupabaseUrl = env.PUBLIC_SUPABASE_URL ?? '';
const publicSupabaseKey = env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

// Kept for backward-compatibility (e.g. direct fetch calls to edge functions)
export const supabaseUrl = publicSupabaseUrl.replace(/\/$/, '');
export const supabaseKey = publicSupabaseKey;

if (browser && (!publicSupabaseUrl || !publicSupabaseKey)) {
	throw new Error('Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_PUBLISHABLE_KEY');
}

/**
 * Browser-side Supabase client that manages auth via cookies (SSR-compatible).
 * Only instantiated in the browser – on the server use `event.locals.supabase` instead.
 * All existing imports continue to work; the value is `null` during SSR,
 * but every usage of this client is guarded by `onMount` (browser-only).
 */
export const supabase = browser
    ? createBrowserClient(publicSupabaseUrl, publicSupabaseKey)
    : /** @type {any} */ (null);
