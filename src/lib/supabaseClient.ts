import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const publicSupabaseUrl = env.PUBLIC_SUPABASE_URL;
const publicSupabaseKey = env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseUrl = publicSupabaseUrl.replace(/\/$/, '');
export const supabaseKey = publicSupabaseKey;

type BrowserSupabaseClient = SupabaseClient;

let browserClient: BrowserSupabaseClient | null = null;

const TOKEN_REFRESH_MARGIN_MS = 30 * 1000;
let cachedToken: { value: string; expiresAtMs: number } | null = null;
let pendingToken: Promise<string | null> | null = null;

async function fetchAccessToken(): Promise<string | null> {
	if (cachedToken && cachedToken.expiresAtMs - TOKEN_REFRESH_MARGIN_MS > Date.now()) {
		return cachedToken.value;
	}
	pendingToken ??= fetch('/api/session/token')
		.then(async (response) => {
			if (!response.ok) {
				cachedToken = null;
				return null;
			}
			const payload = (await response.json()) as { access_token?: unknown; expires_at?: unknown };
			if (typeof payload.access_token !== 'string' || typeof payload.expires_at !== 'number') {
				cachedToken = null;
				return null;
			}
			cachedToken = { value: payload.access_token, expiresAtMs: payload.expires_at * 1000 };
			return payload.access_token;
		})
		.catch(() => cachedToken?.value ?? null)
		.finally(() => {
			pendingToken = null;
		});
	return pendingToken;
}

export function getSupabaseBrowserClient(): BrowserSupabaseClient {
	if (!browser) {
		throw new Error('Use event.locals.supabase on the server.');
	}

	if (!publicSupabaseUrl || !publicSupabaseKey) {
		throw new Error('Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_PUBLISHABLE_KEY');
	}

	browserClient ??= createClient(publicSupabaseUrl, publicSupabaseKey, {
		accessToken: fetchAccessToken
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
