import { forwardToAuth } from '$lib/server/authProxy';
import type { RequestHandler } from './$types';

// Confirme l'activation du MFA email avec le code reçu.
export const POST: RequestHandler = async ({ request, fetch, cookies }) => {
	const body = await request.text();
	const { status, result } = await forwardToAuth(fetch, cookies, '/account/mfa/email/verify', {
		method: 'POST',
		body
	});
	return Response.json(result, { status });
};
