import { describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/public', () => ({
	env: {
		PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
		PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'key',
		PUBLIC_AUTH_BASE_URL: 'https://auth.test/'
	}
}));

const { resolveSessionViaAuth } = await import('$lib/server/authService');

const validPayload = {
	ok: true,
	session: { id: 'sid-1', user_id: 'user-1', access_token: 'at', expires_at: 1234567890 },
	user: { id: 'user-1', email: 'a@b.fr', app_metadata: {}, user_metadata: {} }
};

const jsonResponse = (status: number, body: unknown): Response =>
	new Response(JSON.stringify(body), { status });

describe('resolveSessionViaAuth', () => {
	it('résout une session valide et forwarde le cookie sid', async () => {
		const fetchFn = vi.fn(() => Promise.resolve(jsonResponse(200, validPayload)));
		const result = await resolveSessionViaAuth(fetchFn, 'id.secret');
		expect(result.status).toBe('ok');
		if (result.status === 'ok') {
			expect(result.session.access_token).toBe('at');
			expect(result.user.email).toBe('a@b.fr');
		}
		const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('https://auth.test/session/resolve');
		expect((init.headers as Record<string, string>).cookie).toBe('sid=id.secret');
	});

	it('invalide sur 401', async () => {
		const fetchFn = (() =>
			Promise.resolve(jsonResponse(401, { error: 'invalid_session' }))) as typeof fetch;
		expect((await resolveSessionViaAuth(fetchFn, 'id.secret')).status).toBe('invalid');
	});

	it('indisponible sur 5xx, 404 et 429', async () => {
		for (const status of [500, 503, 404, 429]) {
			const fetchFn = (() => Promise.resolve(jsonResponse(status, {}))) as typeof fetch;
			expect((await resolveSessionViaAuth(fetchFn, 'id.secret')).status).toBe('unavailable');
		}
	});

	it('indisponible sur erreur réseau', async () => {
		const fetchFn = (() => Promise.reject(new Error('down'))) as typeof fetch;
		expect((await resolveSessionViaAuth(fetchFn, 'id.secret')).status).toBe('unavailable');
	});

	it('indisponible sur réponse non-JSON', async () => {
		const fetchFn = (() =>
			Promise.resolve(new Response('pas du json', { status: 200 }))) as typeof fetch;
		expect((await resolveSessionViaAuth(fetchFn, 'id.secret')).status).toBe('unavailable');
	});

	it('indisponible sur payload incomplet', async () => {
		const broken = { ...validPayload, session: { id: 'sid-1' } };
		const fetchFn = (() => Promise.resolve(jsonResponse(200, broken))) as typeof fetch;
		expect((await resolveSessionViaAuth(fetchFn, 'id.secret')).status).toBe('unavailable');
	});
});
