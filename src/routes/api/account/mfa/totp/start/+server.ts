import { forwardToAuth } from '$lib/server/authProxy';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Démarre l'activation TOTP (secret + URL otpauth pour le QR code).
export const POST: RequestHandler = async ({ fetch, cookies }) => {
	const { status, result } = await forwardToAuth(fetch, cookies, '/account/mfa/totp/start', {
		method: 'POST',
		body: '{}'
	});
	return json(result, { status });
};
