import { forwardToAuth } from '@davincibot/lib/server';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Démarre l'activation du MFA email (envoi du code de vérification).
export const POST: RequestHandler = async ({ fetch, cookies }) => {
	const { status, result } = await forwardToAuth(fetch, cookies, '/account/mfa/email/start', {
		method: 'POST',
		body: '{}'
	});
	return json(result, { status });
};
