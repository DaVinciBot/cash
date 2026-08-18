import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	disableMfaMethod,
	ElevationRequiredError,
	fetchMfaState,
	regenerateRecoveryCodes,
	startEmailEnrollment,
	startTotpEnrollment,
	stepUpChallenge,
	stepUpVerify,
	verifyEmailEnrollment,
	verifyTotpEnrollment
} from '$lib/settings';

const jsonResponse = (status: number, body: unknown) => ({
	ok: status < 400,
	status,
	json: () => Promise.resolve(body)
});

// Sur 401, la lib affecte window.location.href = buildLoginUrl(...). jsdom ne
// navigue pas vers un autre domaine : on remplace location par un espion pour
// observer la cible de la redirection.
const stubLocationHref = () => {
	const original = window.location;
	const initialHref = original.href;
	let assignedHref = initialHref;
	Object.defineProperty(window, 'location', {
		configurable: true,
		value: {
			get href() {
				return assignedHref;
			},
			set href(value: string) {
				assignedHref = value;
			}
		}
	});
	return {
		get href() {
			return assignedHref;
		},
		restore() {
			Object.defineProperty(window, 'location', { configurable: true, value: original });
		}
	};
};

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
		const location = stubLocationHref();

		await expect(fetchMfaState()).rejects.toThrow('Session expirée');
		expect(location.href).toContain('/login?redirect=');

		location.restore();
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
	it("startEmailEnrollment poste sur le proxy et renvoie l'adresse destinataire", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse(200, { ok: true, email: 'clement@davincibot.fr' }));
		vi.stubGlobal('fetch', fetchMock);

		await expect(startEmailEnrollment()).resolves.toBe('clement@davincibot.fr');
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

describe('enrôlement TOTP', () => {
	it("startTotpEnrollment renvoie le secret et l'URL otpauth", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse(200, {
				ok: true,
				secret: 'ABCD2345',
				otpauth_url: 'otpauth://totp/DaVinciBot:x?secret=ABCD2345'
			})
		);
		vi.stubGlobal('fetch', fetchMock);

		await expect(startTotpEnrollment()).resolves.toEqual({
			secret: 'ABCD2345',
			otpauth_url: 'otpauth://totp/DaVinciBot:x?secret=ABCD2345'
		});
		expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/account/mfa/totp/start');
	});

	it('verifyTotpEnrollment renvoie les codes de récupération à la première méthode', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse(200, { ok: true, recovery_codes: ['AAAAA-AAAAA'] }));
		vi.stubGlobal('fetch', fetchMock);

		await expect(verifyTotpEnrollment('123456')).resolves.toEqual(['AAAAA-AAAAA']);
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toContain('/api/account/mfa/totp/verify');
		expect(init.body).toBe(JSON.stringify({ code: '123456' }));
	});
});

describe('step-up', () => {
	it('stepUpChallenge renvoie méthode, méthodes disponibles et adresse', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse(200, {
				ok: true,
				method: 'email',
				methods: ['email'],
				email: 'clement@davincibot.fr'
			})
		);
		vi.stubGlobal('fetch', fetchMock);
		await expect(stepUpChallenge()).resolves.toEqual({
			method: 'email',
			methods: ['email'],
			email: 'clement@davincibot.fr'
		});
	});

	it('stepUpChallenge peut demander explicitement la méthode e-mail', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse(200, {
				ok: true,
				method: 'email',
				methods: ['email', 'totp'],
				email: 'clement@davincibot.fr'
			})
		);
		vi.stubGlobal('fetch', fetchMock);
		await stepUpChallenge('email');
		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(init.body).toBe(JSON.stringify({ method: 'email' }));
	});

	it('stepUpChallenge sans MFA renvoie password sans email', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(jsonResponse(200, { ok: true, method: 'password', methods: [] }))
		);
		await expect(stepUpChallenge()).resolves.toEqual({
			method: 'password',
			methods: [],
			email: null
		});
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
