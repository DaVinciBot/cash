import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const NO_STORE = { 'cache-control': 'no-store' };

// Seule surface token côté navigateur : l'access token courant, jamais le refresh token.
export const GET: RequestHandler = ({ locals }) => {
	if (!locals.session) {
		return json({ error: 'Not authenticated' }, { status: 401, headers: NO_STORE });
	}
	return json(
		{ access_token: locals.session.access_token, expires_at: locals.session.expires_at },
		{ headers: NO_STORE }
	);
};
