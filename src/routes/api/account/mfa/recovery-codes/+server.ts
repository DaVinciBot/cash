import { forwardToAuth } from '@davincibot/lib/server';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Régénère les codes de récupération (retournés en clair une seule fois).
export const POST: RequestHandler = async ({ fetch, cookies }) => {
	const { status, result } = await forwardToAuth(fetch, cookies, '/account/mfa/recovery-codes', {
		method: 'POST',
		body: '{}'
	});
	return json(result, { status });
};
