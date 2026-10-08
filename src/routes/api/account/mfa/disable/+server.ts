import { forwardToAuth } from '$lib/server/authProxy';
import type { RequestHandler } from './$types';

// Désactive une méthode MFA du compte.
export const POST: RequestHandler = async ({ request, fetch, cookies }) => {
	const body = await request.text();
	const { status, result } = await forwardToAuth(fetch, cookies, '/account/mfa/disable', {
		method: 'POST',
		body
	});
	return Response.json(result, { status });
};
