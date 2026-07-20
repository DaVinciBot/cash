import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/public', () => ({ env: {} }));
// URL relative : jsdom ne sait pas naviguer vers un autre domaine.
vi.mock('$lib/config/auth', () => ({ buildLoginUrl: () => '#login' }));

const browserMocks = vi.hoisted(() => ({
	startRegistration: vi.fn(),
	startAuthentication: vi.fn()
}));
vi.mock('@simplewebauthn/browser', () => browserMocks);

import { stepUpVerifyWebauthn } from '@davincibot/lib/settings';
import {
	deletePasskey,
	fetchPasskeys,
	registerPasskey,
	renamePasskey
} from '@davincibot/lib/settings';
import { ElevationRequiredError } from '@davincibot/lib/settings';

const jsonResponse = (status: number, body: unknown) => ({
	ok: status < 400,
	status,
	json: () => Promise.resolve(body)
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

describe('fetchPasskeys', () => {
	it('retourne la liste', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse(200, { ok: true, passkeys: [{ id: 'pk-1' }] }));
		vi.stubGlobal('fetch', fetchMock);
		await expect(fetchPasskeys()).resolves.toEqual([{ id: 'pk-1' }]);
		expect(fetchMock).toHaveBeenCalledWith('/admin/api/account/passkeys');
	});
});

describe('registerPasskey', () => {
	it('enchaîne options → cérémonie navigateur → verify et retourne les codes', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse(200, { ok: true, options: { challenge: 'ch' } }))
			.mockResolvedValueOnce(
				jsonResponse(200, { ok: true, id: 'pk-9', recovery_codes: ['AAAAA-BBBBB'] })
			);
		vi.stubGlobal('fetch', fetchMock);
		browserMocks.startRegistration.mockResolvedValue({ id: 'cred', type: 'public-key' });

		await expect(registerPasskey('Téléphone')).resolves.toEqual({
			id: 'pk-9',
			recovery_codes: ['AAAAA-BBBBB']
		});
		expect(browserMocks.startRegistration).toHaveBeenCalledWith({
			optionsJSON: { challenge: 'ch' }
		});
		const verifyCall = fetchMock.mock.calls[1] as [string, { body: string }];
		expect(verifyCall[0]).toBe('/admin/api/account/passkeys/register/verify');
		expect(JSON.parse(verifyCall[1].body)).toEqual({
			response: { id: 'cred', type: 'public-key' },
			name: 'Téléphone'
		});
	});

	it("propage ElevationRequiredError quand l'élévation manque", async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse(403, { error: 'elevation_required' }));
		vi.stubGlobal('fetch', fetchMock);
		await expect(registerPasskey('x')).rejects.toBeInstanceOf(ElevationRequiredError);
		expect(browserMocks.startRegistration).not.toHaveBeenCalled();
	});
});

describe('renamePasskey / deletePasskey', () => {
	it('postent id et nom aux bons endpoints', async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
		vi.stubGlobal('fetch', fetchMock);

		await renamePasskey('pk-1', 'Nouveau nom');
		await deletePasskey('pk-2');

		const renameCall = fetchMock.mock.calls[0] as [string, { body: string }];
		expect(renameCall[0]).toBe('/admin/api/account/passkeys/rename');
		expect(JSON.parse(renameCall[1].body)).toEqual({ id: 'pk-1', name: 'Nouveau nom' });
		const deleteCall = fetchMock.mock.calls[1] as [string, { body: string }];
		expect(deleteCall[0]).toBe('/admin/api/account/passkeys/delete');
		expect(JSON.parse(deleteCall[1].body)).toEqual({ id: 'pk-2' });
	});
});

describe('stepUpVerifyWebauthn', () => {
	it('demande un challenge webauthn, joue la cérémonie et poste la réponse', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				jsonResponse(200, {
					ok: true,
					method: 'webauthn',
					methods: ['webauthn'],
					options: { challenge: 'ch' }
				})
			)
			.mockResolvedValueOnce(jsonResponse(200, { ok: true }));
		vi.stubGlobal('fetch', fetchMock);
		browserMocks.startAuthentication.mockResolvedValue({ id: 'cred', type: 'public-key' });

		await expect(stepUpVerifyWebauthn()).resolves.toBeUndefined();
		const challengeCall = fetchMock.mock.calls[0] as [string, { body: string }];
		expect(challengeCall[0]).toBe('/admin/api/account/step-up/challenge');
		expect(JSON.parse(challengeCall[1].body)).toEqual({ method: 'webauthn' });
		expect(browserMocks.startAuthentication).toHaveBeenCalledWith({
			optionsJSON: { challenge: 'ch' }
		});
		const verifyCall = fetchMock.mock.calls[1] as [string, { body: string }];
		expect(verifyCall[0]).toBe('/admin/api/account/step-up/verify');
		expect(JSON.parse(verifyCall[1].body)).toEqual({
			method: 'webauthn',
			webauthn_response: { id: 'cred', type: 'public-key' }
		});
	});

	it('échoue proprement si le service ne propose pas la méthode', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse(200, { ok: true, method: 'email', methods: ['email'] }));
		vi.stubGlobal('fetch', fetchMock);
		await expect(stepUpVerifyWebauthn()).rejects.toThrow();
		expect(browserMocks.startAuthentication).not.toHaveBeenCalled();
	});
});
