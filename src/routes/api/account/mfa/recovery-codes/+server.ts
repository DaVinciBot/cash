import { forwardToAuth } from '$lib/server/authProxy';
import type { RequestHandler } from './$types';

// Régénère les codes de récupération (retournés en clair une seule fois).
export const POST: RequestHandler = async ({ fetch, cookies }) => {
	const { status, result } = await forwardToAuth(fetch, cookies, '/account/mfa/recovery-codes', {
		method: 'POST',
		body: '{}'
	});
	return Response.json(result, { status });
};
