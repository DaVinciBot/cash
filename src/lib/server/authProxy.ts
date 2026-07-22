import { env } from '$env/dynamic/public';
import type { Cookies } from '@sveltejs/kit';
import { sidCookieName } from '@davincibot/lib/server';

export interface AuthProxyResponse {
	status: number;
	result: Record<string, unknown>;
}

// Relais serveur→serveur vers le service auth (forward du cookie sid HttpOnly,
// pas de CORS) : la réponse du service est renvoyée telle quelle au navigateur.
export const forwardToAuth = async (
	fetchFn: typeof fetch,
	cookies: Cookies,
	path: string,
	init: { method?: 'GET' | 'POST'; body?: string } = {}
): Promise<AuthProxyResponse> => {
	const rawAuthBase = env.PUBLIC_AUTH_BASE_URL;
	const authBase = rawAuthBase ? rawAuthBase.replace(/\/$/, '') : 'https://auth.davincibot.fr';
	const sid = cookies.get(sidCookieName());
	const response = await fetchFn(`${authBase}${path}`, {
		method: init.method ?? 'GET',
		headers: {
			...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
			...(sid ? { cookie: `${sidCookieName()}=${sid}` } : {})
		},
		...(init.body === undefined ? {} : { body: init.body })
	});
	const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;
	return { status: response.status, result };
};
