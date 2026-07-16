import { env } from '$env/dynamic/public';
import type { Cookies } from '@sveltejs/kit';

// Préfixe optionnel (ex. "dev-") aligné sur le service auth : isole les cookies
// d'un environnement qui partage le domaine racine avec la prod.
export const sidCookieName = (): string => `${env.PUBLIC_COOKIE_PREFIX ?? ''}sid`;

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
