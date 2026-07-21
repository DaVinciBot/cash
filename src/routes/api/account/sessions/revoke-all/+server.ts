import { forwardToAuth } from '@davincibot/lib/server';
import { sessionCache } from '$lib/server/sessionCacheInstance';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Révocation de toutes les autres sessions du compte. Purge complète du cache
// local (coût de re-résolution négligeable, une seule réplique).
export const POST: RequestHandler = async ({ fetch, cookies }) => {
	const { status, result } = await forwardToAuth(fetch, cookies, '/account/sessions/revoke-all', {
		method: 'POST'
	});
	if (status === 200) {
		sessionCache.clear();
	}
	return json(result, { status });
};
