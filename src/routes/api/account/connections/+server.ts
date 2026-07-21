import { forwardToAuth } from '@davincibot/lib/server';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Applications tierces liées au compte en OIDC, relayées depuis le service auth.
export const GET: RequestHandler = async ({ fetch, cookies }) => {
	const { status, result } = await forwardToAuth(fetch, cookies, '/account/connections');
	return json(result, { status });
};
