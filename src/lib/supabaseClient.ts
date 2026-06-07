import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const publicSupabaseUrl = env.PUBLIC_SUPABASE_URL;
const publicSupabaseKey = env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseUrl = publicSupabaseUrl.replace(/\/$/, '');
export const supabaseKey = publicSupabaseKey;

type BrowserSupabaseClient = SupabaseClient;

let browserClient: BrowserSupabaseClient | null = null;

function getCookieOptions() {
	if (!browser) {
		return undefined;
	}

	const isLocalhost =
		window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

	return {
		domain: isLocalhost ? undefined : '.davincibot.fr',
		path: '/',
		sameSite: 'lax' as const,
		secure: window.location.protocol === 'https:'
	};
}

export function getSupabaseBrowserClient(): BrowserSupabaseClient {
	if (!browser) {
		throw new Error('Use event.locals.supabase on the server.');
	}

	if (!publicSupabaseUrl || !publicSupabaseKey) {
		throw new Error('Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_PUBLISHABLE_KEY');
	}

	browserClient ??= createBrowserClient(publicSupabaseUrl, publicSupabaseKey, {
		auth: {
			flowType: 'pkce'
		},
		cookieOptions: getCookieOptions()
	});

	return browserClient;
}

/**
 * @deprecated Prefer getSupabaseBrowserClient() in browser code and event.locals.supabase on
 * the server. Kept temporarily for existing browser-only imports.
 */
export const supabase = new Proxy({} as BrowserSupabaseClient, {
	get(_, property: string | symbol): unknown {
		const client = getSupabaseBrowserClient() as unknown as Record<string | symbol, unknown>;
		return client[property];
	}
});
