import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import { createBrowserClient } from '@supabase/ssr';

const publicSupabaseUrl = env.PUBLIC_SUPABASE_URL ?? '';
const publicSupabaseKey = env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

export const supabaseUrl = publicSupabaseUrl.replace(/\/$/, '');
export const supabaseKey = publicSupabaseKey;

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let browserClient = null;

function getCookieOptions() {
	if (!browser) return undefined;

	const isLocalhost =
		window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
	const sameSite = /** @type {'lax'} */ ('lax');

	return {
		domain: isLocalhost ? undefined : '.davincibot.fr',
		path: '/',
		sameSite,
		secure: window.location.protocol === 'https:'
	};
}

/** @returns {import('@supabase/supabase-js').SupabaseClient} */
export function getSupabaseBrowserClient() {
	if (!browser) {
		throw new Error('Use event.locals.supabase on the server.');
	}

	if (!publicSupabaseUrl || !publicSupabaseKey) {
		throw new Error('Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_PUBLISHABLE_KEY');
	}

	if (!browserClient) {
		browserClient = createBrowserClient(publicSupabaseUrl, publicSupabaseKey, {
			auth: {
				flowType: 'pkce'
			},
			cookieOptions: getCookieOptions()
		});
	}

	return browserClient;
}

/**
 * @deprecated Prefer getSupabaseBrowserClient() in browser code and event.locals.supabase on
 * the server. Kept temporarily for existing browser-only imports.
 * @type {import('@supabase/supabase-js').SupabaseClient}
 */
export const supabase = /** @type {import('@supabase/supabase-js').SupabaseClient} */ (
	new Proxy(
		{},
		{
			get(_, property) {
				const client = /** @type {Record<string | symbol, unknown>} */ (
					/** @type {unknown} */ (getSupabaseBrowserClient())
				);
				return client[property];
			}
		}
	)
);
