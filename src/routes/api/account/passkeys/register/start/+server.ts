import { forwardToAuth } from '$lib/server/authProxy';
import type { RequestHandler } from './$types';

// Démarre l'enrôlement d'une passkey (options WebAuthn + challenge).
export const POST: RequestHandler = async ({ fetch, cookies }) => {
	const { status, result } = await forwardToAuth(
		fetch,
		cookies,
		'/account/passkeys/register/start',
		{
			method: 'POST',
			body: '{}'
		}
	);
	return Response.json(result, { status });
};
