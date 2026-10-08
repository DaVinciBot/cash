import { forwardToAuth } from '$lib/server/authProxy';
import type { RequestHandler } from './$types';

// Sessions actives du compte (appareils connectés), relayées depuis le service auth.
export const GET: RequestHandler = async ({ fetch, cookies }) => {
	const { status, result } = await forwardToAuth(fetch, cookies, '/account/sessions');
	return Response.json(result, { status });
};
