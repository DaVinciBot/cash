import { sidCookieName } from '@davincibot/lib/server';
import { env } from '$env/dynamic/public';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Relais serveur→serveur vers le service auth (forward du cookie sid) : le
// changement de mot de passe passe par la session sid, sans exposer de CORS.
export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await request.text();
	const rawAuthBase = env.PUBLIC_AUTH_BASE_URL;
	const authBase = rawAuthBase ? rawAuthBase.replace(/\/$/, '') : 'https://auth.davincibot.fr';
	const sid = cookies.get(sidCookieName());
	const response = await fetch(`${authBase}/password`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...(sid ? { cookie: `${sidCookieName()}=${sid}` } : {})
		},
		body
	});
	const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;
	return json(result, { status: response.status });
};
