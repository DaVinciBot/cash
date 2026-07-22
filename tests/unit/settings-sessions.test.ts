import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/public', () => ({ env: {} }));
// URL relative : jsdom ne sait pas naviguer vers un autre domaine.
vi.mock('@davincibot/lib', () => ({ buildLoginUrl: () => '#login' }));

import {
	fetchConnections,
	fetchSessions,
	revokeAllSessions,
	revokeConnection,
	revokeSession
} from '@davincibot/lib/settings';

const jsonResponse = (status: number, body: unknown) => ({
	ok: status < 400,
	status,
	json: () => Promise.resolve(body)
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('fetchSessions', () => {
	it('appelle le proxy et renvoie la liste', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse(200, { sessions: [{ id: 's1', is_current: true }] }));
		vi.stubGlobal('fetch', fetchMock);

		const sessions = await fetchSessions();

		expect(sessions).toEqual([{ id: 's1', is_current: true }]);
		expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/account/sessions');
	});

	it('remonte le message d’erreur du serveur', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(jsonResponse(500, { error: 'Service indisponible' }))
		);

		await expect(fetchSessions()).rejects.toThrow('Service indisponible');
	});

	it('renvoie vers la connexion sur un 401 (session expirée)', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, { error: 'Non connecté' })));

		await expect(fetchSessions()).rejects.toThrow('Session expirée');
		expect(window.location.hash).toBe('#login');
	});
});

describe('revokeSession', () => {
	it('poste le session_id visé', async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
		vi.stubGlobal('fetch', fetchMock);

		await expect(revokeSession('session-a')).resolves.toBeUndefined();

		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toContain('/api/account/sessions/revoke');
		expect(init.method).toBe('POST');
		expect(init.body).toBe(JSON.stringify({ session_id: 'session-a' }));
	});

	it('remonte l’erreur du service (liste périmée)', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(jsonResponse(404, { error: 'Session introuvable' }))
		);

		await expect(revokeSession('session-a')).rejects.toThrow('Session introuvable');
	});
});

describe('revokeAllSessions', () => {
	it('poste sur revoke-all et résout sur succès', async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true, revoked: 3 }));
		vi.stubGlobal('fetch', fetchMock);

		await expect(revokeAllSessions()).resolves.toBeUndefined();
		expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/account/sessions/revoke-all');
	});
});

describe('fetchConnections', () => {
	it('renvoie la liste des applications connectées', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				jsonResponse(200, {
					connections: [{ client_id: 'rallly', name: 'Rallly', active: true }]
				})
			)
		);

		await expect(fetchConnections()).resolves.toEqual([
			{ client_id: 'rallly', name: 'Rallly', active: true }
		]);
	});

	it('utilise un message de repli sans corps d’erreur', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.reject(new Error()) })
		);

		await expect(fetchConnections()).rejects.toThrow(
			'Une erreur est survenue lors de la récupération des applications connectées'
		);
	});
});

describe('revokeConnection', () => {
	it('poste le client_id visé', async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true, deleted: 2 }));
		vi.stubGlobal('fetch', fetchMock);

		await expect(revokeConnection('rallly')).resolves.toBeUndefined();

		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toContain('/api/account/connections/revoke');
		expect(init.body).toBe(JSON.stringify({ client_id: 'rallly' }));
	});
});
