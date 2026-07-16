import { forwardToAuth } from '$lib/server/authProxy';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Prépare un step-up : code envoyé par email, ou mot de passe attendu sans MFA.
export const POST: RequestHandler = async ({ fetch, cookies }) => {
	const { status, result } = await forwardToAuth(fetch, cookies, '/account/step-up/challenge', {
		method: 'POST',
		body: '{}'
	});
	return json(result, { status });
};
