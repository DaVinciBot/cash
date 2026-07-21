import { forwardToAuth } from '@davincibot/lib/server';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Révocation du lien OIDC avec une application (suppression de ses jetons côté auth).
export const POST: RequestHandler = async ({ request, fetch, cookies }) => {
	const body = await request.text();
	const { status, result } = await forwardToAuth(fetch, cookies, '/account/connections/revoke', {
		method: 'POST',
		body
	});
	return json(result, { status });
};
