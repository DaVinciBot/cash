import { forwardToAuth } from '$lib/server/authProxy';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ fetch, cookies, request }) => {
	const body = await request.text();
	const { status, result } = await forwardToAuth(fetch, cookies, '/account/passkeys/delete', {
		method: 'POST',
		body
	});
	return json(result, { status });
};
