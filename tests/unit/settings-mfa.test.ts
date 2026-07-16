import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/public', () => ({ env: {} }));
// URL relative : jsdom ne sait pas naviguer vers un autre domaine.
vi.mock('$lib/config/auth', () => ({ buildLoginUrl: () => '#login' }));

import {
	disableMfaMethod,
	fetchMfaState,
	regenerateRecoveryCodes,
	startEmailEnrollment,
	stepUpChallenge,
	stepUpVerify,
	verifyEmailEnrollment
} from '$lib/settings/mfa';
import { ElevationRequiredError } from '$lib/settings/stepUp';

const jsonResponse = (status: number, body: unknown) => ({
	ok: status < 400,
	status,
	json: () => Promise.resolve(body)
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('fetchMfaState', () => {
	it("appelle le proxy et renvoie l'état", async () => {
		const state = {
			methods: [{ id: 'm1', method_type: 'email', created_at: 'now', last_used_at: null }],
			recovery_codes_remaining: 8,
			has_mfa: true,
			elevated: false
		};
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, state));
		vi.stubGlobal('fetch', fetchMock);

		await expect(fetchMfaState()).resolves.toEqual(state);
		expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/account/mfa');
	});

	it('renvoie vers la connexion sur un 401', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, {})));
		await expect(fetchMfaState()).rejects.toThrow('Session expirée');
		expect(window.location.hash).toBe('#login');
	});
});

describe('erreur elevation_required', () => {
	it('devient une ElevationRequiredError typée', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(jsonResponse(403, { error: 'elevation_required' }))
		);
		await expect(disableMfaMethod('m1')).rejects.toThrow(ElevationRequiredError);
	});

	it('un autre 403 reste une erreur ordinaire', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(403, { error: 'Forbidden' })));
		await expect(disableMfaMethod('m1')).rejects.toThrow('Forbidden');
		await expect(disableMfaMethod('m1')).rejects.not.toThrow(ElevationRequiredError);
	});
});

describe('enrôlement email', () => {
	it('startEmailEnrollment poste sur le proxy', async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
		vi.stubGlobal('fetch', fetchMock);

		await expect(startEmailEnrollment()).resolves.toBeUndefined();
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toContain('/api/account/mfa/email/start');
		expect(init.method).toBe('POST');
	});

	it('verifyEmailEnrollment renvoie les codes de récupération à la première méthode', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse(200, { ok: true, recovery_codes: ['AAAAA-AAAAA'] }));
		vi.stubGlobal('fetch', fetchMock);

		await expect(verifyEmailEnrollment('123456')).resolves.toEqual(['AAAAA-AAAAA']);
		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(init.body).toBe(JSON.stringify({ code: '123456' }));
	});

	it('verifyEmailEnrollment renvoie null sans codes (méthode additionnelle)', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { ok: true })));
		await expect(verifyEmailEnrollment('123456')).resolves.toBe(null);
	});
});

describe('désactivation et codes', () => {
	it('disableMfaMethod poste le method_id', async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
		vi.stubGlobal('fetch', fetchMock);

		await disableMfaMethod('m1');
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toContain('/api/account/mfa/disable');
		expect(init.body).toBe(JSON.stringify({ method_id: 'm1' }));
	});

	it('regenerateRecoveryCodes renvoie le nouveau jeu', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(jsonResponse(200, { ok: true, recovery_codes: ['BBBBB-BBBBB'] }))
		);
		await expect(regenerateRecoveryCodes()).resolves.toEqual(['BBBBB-BBBBB']);
	});
});

describe('step-up', () => {
	it('stepUpChallenge renvoie la méthode attendue', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(jsonResponse(200, { ok: true, method: 'email' }))
		);
		await expect(stepUpChallenge()).resolves.toBe('email');
	});

	it('stepUpVerify poste la preuve fournie', async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
		vi.stubGlobal('fetch', fetchMock);

		await stepUpVerify({ password: 'secret' });
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toContain('/api/account/step-up/verify');
		expect(init.body).toBe(JSON.stringify({ password: 'secret' }));
	});

	it('stepUpVerify remonte le message du service en échec', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(jsonResponse(401, { error: 'Vérification échouée.' }))
		);
		await expect(stepUpVerify({ code: '000000' })).rejects.toThrow('Vérification échouée.');
	});
});
