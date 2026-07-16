import { forwardToAuth } from '$lib/server/authProxy';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Prépare un step-up : TOTP ou code envoyé par email selon la méthode demandée,
// ou mot de passe attendu sans MFA.
export const POST: RequestHandler = async ({ request, fetch, cookies }) => {
	const body = await request.text();
	const { status, result } = await forwardToAuth(fetch, cookies, '/account/step-up/challenge', {
		method: 'POST',
		body: body || '{}'
	});
	return json(result, { status });
};
