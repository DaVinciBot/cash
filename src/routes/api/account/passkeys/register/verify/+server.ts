import { forwardToAuth } from '$lib/server/authProxy';
import type { RequestHandler } from './$types';

// Vérifie l'attestation WebAuthn et enregistre la passkey.
export const POST: RequestHandler = async ({ fetch, cookies, request }) => {
	const body = await request.text();
	const { status, result } = await forwardToAuth(
		fetch,
		cookies,
		'/account/passkeys/register/verify',
		{ method: 'POST', body }
	);
	return Response.json(result, { status });
};
