
import { createBrowserClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';
import { browser } from '$app/environment';

// Kept for backward-compatibility (e.g. direct fetch calls to edge functions)
export const supabaseUrl = PUBLIC_SUPABASE_URL.replace(/\/$/, '');
export const supabaseKey = PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Browser-side Supabase client that manages auth via cookies (SSR-compatible).
 * Only instantiated in the browser – on the server use `event.locals.supabase` instead.
 * All existing imports continue to work; the value is `null` during SSR,
 * but every usage of this client is guarded by `onMount` (browser-only).
 */
export const supabase = browser
    ? createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    : /** @type {any} */ (null);
