import { forwardToAuth } from '#lib/server/authProxy.js';
import type { RequestHandler } from './$types';

// Passkeys du compte, relayées depuis le service auth.
export const GET: RequestHandler = async ({ fetch, cookies }) => {
	const { status, result } = await forwardToAuth(fetch, cookies, '/account/passkeys');
	return Response.json(result, { status });
};
