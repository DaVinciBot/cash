import { forwardToAuth } from '$lib/server/authProxy';
import { sessionCache } from '$lib/server/sessionCacheInstance';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const readSessionId = (body: string): string | null => {
	try {
		const parsed: unknown = JSON.parse(body);
		if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
			const value = (parsed as Record<string, unknown>).session_id;
			return typeof value === 'string' ? value : null;
		}
	} catch {
		// corps invalide : le service auth répond 400, rien à purger
	}
	return null;
};

// Révocation d'une session ciblée. Purge aussi le cache local : l'appareil
// révoqué est déconnecté de cash dès sa prochaine requête, sans attendre le TTL.
export const POST: RequestHandler = async ({ request, fetch, cookies }) => {
	const body = await request.text();
	const { status, result } = await forwardToAuth(fetch, cookies, '/account/sessions/revoke', {
		method: 'POST',
		body
	});
	if (status === 200) {
		const sessionId = readSessionId(body);
		if (sessionId) {
			sessionCache.delete(sessionId);
		}
	}
	return json(result, { status });
};
