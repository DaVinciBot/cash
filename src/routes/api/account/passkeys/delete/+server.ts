import { forwardToAuth } from '$lib/server/authProxy';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ fetch, cookies, request }) => {
	const body = await request.text();
	const { status, result } = await forwardToAuth(fetch, cookies, '/account/passkeys/delete', {
		method: 'POST',
		body
	});
	return Response.json(result, { status });
};
