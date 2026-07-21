import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/public', () => ({
	env: {
		PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
		PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'key',
		PUBLIC_AUTH_BASE_URL: 'https://auth.test/'
	}
}));

const { forwardToAuth } = await import('@davincibot/lib/server');
const { sessionCache } = await import('$lib/server/sessionCacheInstance');
const { GET: getSessions } = await import('../../src/routes/api/account/sessions/+server');
const { POST: revokeSession } =
	await import('../../src/routes/api/account/sessions/revoke/+server');
const { POST: revokeAllSessions } =
	await import('../../src/routes/api/account/sessions/revoke-all/+server');
const { GET: getConnections } = await import('../../src/routes/api/account/connections/+server');
const { POST: revokeConnection } =
	await import('../../src/routes/api/account/connections/revoke/+server');

const jsonResponse = (status: number, body: unknown): Response =>
	new Response(JSON.stringify(body), { status });

const makeCookies = (sid?: string) => ({ get: () => sid });

interface EventOverrides {
	fetchFn: unknown;
	sid?: string;
	body?: string;
}

// Événement minimal casté en never : chaque handler ne consomme que fetch/cookies/request.
const makeEvent = ({ fetchFn, sid, body }: EventOverrides): never =>
	({
		fetch: fetchFn,
		cookies: makeCookies(sid),
		request: new Request('http://localhost/admin/api', {
			method: 'POST',
			...(body === undefined ? {} : { body })
		})
	}) as never;

const cacheSession = (id: string, secret = 'secret') => {
	sessionCache.set(
		id,
		{ id, access_token: 'at', expires_at: Math.floor(Date.now() / 1000) + 3600, user_id: 'u1' },
		{ id: 'u1' } as never,
		secret
	);
};

beforeEach(() => {
	sessionCache.clear();
});

describe('forwardToAuth', () => {
	it('forwarde le cookie sid et normalise la base auth', async () => {
		const fetchFn = vi.fn(() => Promise.resolve(jsonResponse(200, { ok: true })));
		const { status, result } = await forwardToAuth(
			fetchFn,
			makeCookies('id.secret') as never,
			'/account/sessions'
		);
		expect(status).toBe(200);
		expect(result).toEqual({ ok: true });
		const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('https://auth.test/account/sessions');
		expect(init.method).toBe('GET');
		expect((init.headers as Record<string, string>).cookie).toBe('sid=id.secret');
	});

	it('n’envoie pas de cookie sans sid et tolère une réponse non-JSON', async () => {
		const fetchFn = vi.fn(() => Promise.resolve(new Response('pas du json', { status: 502 })));
		const { status, result } = await forwardToAuth(
			fetchFn,
			makeCookies(undefined) as never,
			'/account/sessions'
		);
		expect(status).toBe(502);
		expect(result).toEqual({});
		const [, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
		expect((init.headers as Record<string, string>).cookie).toBeUndefined();
	});
});

describe('GET /api/account/sessions', () => {
	it('relaie la réponse et le statut du service auth', async () => {
		const payload = { sessions: [{ id: 's1', is_current: true }] };
		const fetchFn = vi.fn(() => Promise.resolve(jsonResponse(200, payload)));
		const response = await getSessions(makeEvent({ fetchFn, sid: 'a.b' }));
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(payload);
	});
});

describe('POST /api/account/sessions/revoke', () => {
	it('purge la session révoquée du cache local sur succès', async () => {
		cacheSession('session-a');
		cacheSession('session-b');
		const fetchFn = vi.fn(() => Promise.resolve(jsonResponse(200, { ok: true })));
		const response = await revokeSession(
			makeEvent({
				fetchFn,
				sid: 'a.b',
				body: JSON.stringify({ session_id: 'session-a' })
			})
		);
		expect(response.status).toBe(200);
		expect(sessionCache.getFresh('session-a', 'secret')).toBeNull();
		expect(sessionCache.getFresh('session-b', 'secret')).not.toBeNull();
	});

	it('ne touche pas au cache quand le service auth refuse', async () => {
		cacheSession('session-a');
		const fetchFn = vi.fn(() => Promise.resolve(jsonResponse(404, { error: 'introuvable' })));
		const response = await revokeSession(
			makeEvent({
				fetchFn,
				sid: 'a.b',
				body: JSON.stringify({ session_id: 'session-a' })
			})
		);
		expect(response.status).toBe(404);
		expect(sessionCache.getFresh('session-a', 'secret')).not.toBeNull();
	});
});

describe('POST /api/account/sessions/revoke-all', () => {
	it('vide le cache local sur succès', async () => {
		cacheSession('session-a');
		cacheSession('session-b');
		const fetchFn = vi.fn(() => Promise.resolve(jsonResponse(200, { ok: true, revoked: 2 })));
		const response = await revokeAllSessions(makeEvent({ fetchFn, sid: 'a.b' }));
		expect(response.status).toBe(200);
		expect(sessionCache.getFresh('session-a', 'secret')).toBeNull();
		expect(sessionCache.getFresh('session-b', 'secret')).toBeNull();
	});
});

describe('proxys /api/account/connections', () => {
	it('relaie le listing des applications connectées', async () => {
		const payload = { connections: [{ client_id: 'rallly', active: true }] };
		const fetchFn = vi.fn(() => Promise.resolve(jsonResponse(200, payload)));
		const response = await getConnections(makeEvent({ fetchFn, sid: 'a.b' }));
		expect(await response.json()).toEqual(payload);
	});

	it('relaie la révocation avec le corps et la méthode POST', async () => {
		const fetchFn = vi.fn(() => Promise.resolve(jsonResponse(200, { ok: true, deleted: 2 })));
		const body = JSON.stringify({ client_id: 'rallly' });
		const response = await revokeConnection(makeEvent({ fetchFn, sid: 'a.b', body }));
		expect(response.status).toBe(200);
		const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('https://auth.test/account/connections/revoke');
		expect(init.method).toBe('POST');
		expect(init.body).toBe(body);
	});
});
