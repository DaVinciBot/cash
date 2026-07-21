import { forwardToAuth } from '@davincibot/lib/server';
import { json } from '@sveltejs/kit';
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
	return json(result, { status });
};
