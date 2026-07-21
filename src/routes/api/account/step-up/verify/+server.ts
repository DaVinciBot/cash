import { forwardToAuth } from '$lib/server/authProxy';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Vérifie la preuve de step-up et élève la session côté auth.
export const POST: RequestHandler = async ({ request, fetch, cookies }) => {
	const body = await request.text();
	const { status, result } = await forwardToAuth(fetch, cookies, '/account/step-up/verify', {
		method: 'POST',
		body
	});
	return json(result, { status });
};
