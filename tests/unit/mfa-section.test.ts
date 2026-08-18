import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { flushSync, mount, unmount } from 'svelte';

import type * as SettingsModule from '$lib/settings';

vi.mock('$env/dynamic/public', () => ({ env: {} }));

const mocks = vi.hoisted(() => ({
	fetchMfaState: vi.fn(),
	startEmailEnrollment: vi.fn(),
	verifyEmailEnrollment: vi.fn(),
	startTotpEnrollment: vi.fn(),
	verifyTotpEnrollment: vi.fn(),
	disableMfaMethod: vi.fn(),
	regenerateRecoveryCodes: vi.fn(),
	stepUpChallenge: vi.fn(),
	stepUpVerify: vi.fn()
}));

const passkeyMocks = vi.hoisted(() => ({
	fetchPasskeys: vi.fn(),
	registerPasskey: vi.fn(),
	renamePasskey: vi.fn(),
	deletePasskey: vi.fn()
}));

// mfa et passkeys sont réexportés par le même barrel $lib/settings :
// un seul vi.mock, sinon le second écraserait le premier. On garde le reste du
// barrel réel (stepUpRequest, withStepUp, alertUnlessCancelled…) dont dépend la
// section.
vi.mock('$lib/settings', async (importOriginal) => ({
	...(await importOriginal<typeof SettingsModule>()),
	...mocks,
	...passkeyMocks
}));

import MfaSection from '$lib/components/settings/MfaSection.svelte';

const stateWithoutMfa = {
	methods: [],
	recovery_codes_remaining: 0,
	has_mfa: false,
	elevated: false
};

const stateWithEmail = {
	methods: [
		{
			id: 'method-email',
			method_type: 'email',
			created_at: '2026-07-16T08:00:00Z',
			last_used_at: '2026-07-16T09:00:00Z'
		}
	],
	recovery_codes_remaining: 7,
	has_mfa: true,
	elevated: true
};

const stateWithPasskey = {
	methods: [
		{
			id: 'method-webauthn',
			method_type: 'webauthn',
			created_at: '2026-07-17T08:00:00Z',
			last_used_at: null
		}
	],
	recovery_codes_remaining: 8,
	has_mfa: true,
	elevated: true
};

let cleanup: (() => void) | null = null;

function mountSection() {
	const target = document.createElement('div');
	document.body.appendChild(target);
	const instance = mount(MfaSection, { target });
	flushSync();
	cleanup = () => {
		void unmount(instance);
		target.remove();
	};
	return target;
}

const waitForSelector = async (target: HTMLElement, selector: string) => {
	await vi.waitFor(() => {
		flushSync();
		expect(target.querySelector(selector)).not.toBeNull();
	});
};

const setInputValue = (target: HTMLElement, selector: string, value: string) => {
	const input = target.querySelector<HTMLInputElement>(selector);
	expect(input).not.toBeNull();
	if (input) {
		input.value = value;
		input.dispatchEvent(new Event('input', { bubbles: true }));
	}
	flushSync();
};

beforeEach(() => {
	vi.clearAllMocks();
	mocks.fetchMfaState.mockResolvedValue(stateWithoutMfa);
	mocks.startEmailEnrollment.mockResolvedValue(undefined);
	mocks.verifyEmailEnrollment.mockResolvedValue(null);
	mocks.disableMfaMethod.mockResolvedValue(undefined);
	mocks.regenerateRecoveryCodes.mockResolvedValue(['AAAAA-AAAAA']);
	passkeyMocks.fetchPasskeys.mockResolvedValue([]);
	// jsdom n'expose pas WebAuthn : simule un navigateur compatible.
	vi.stubGlobal('PublicKeyCredential', {});
	vi.spyOn(window, 'confirm').mockReturnValue(true);
	vi.spyOn(window, 'alert').mockImplementation(() => undefined);
});

afterEach(() => {
	cleanup?.();
	cleanup = null;
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('MfaSection — sans méthode', () => {
	it("propose d'activer la vérification par e-mail", async () => {
		const target = mountSection();
		await waitForSelector(target, '#mfa-enable-email');
		expect(target.querySelector('#mfa-section')?.textContent).toContain(
			'Vérification en deux étapes'
		);
	});

	it("l'activation envoie le code puis affiche la saisie avec l'adresse destinataire", async () => {
		mocks.startEmailEnrollment.mockResolvedValue('clement@davincibot.fr');
		const target = mountSection();
		await waitForSelector(target, '#mfa-enable-email');

		target.querySelector<HTMLButtonElement>('#mfa-enable-email')?.click();
		flushSync();

		await waitForSelector(target, '#mfa-enroll-code-0');
		expect(mocks.startEmailEnrollment).toHaveBeenCalledTimes(1);
		expect(target.querySelector('#mfa-section')?.textContent).toContain('clement@davincibot.fr');
	});

	it("l'activation TOTP ouvre le modal avec la clé et valide le code", async () => {
		mocks.startTotpEnrollment.mockResolvedValue({
			secret: 'ABCD2345ABCD2345',
			otpauth_url: 'otpauth://totp/DaVinciBot:x?secret=ABCD2345ABCD2345'
		});
		mocks.verifyTotpEnrollment.mockResolvedValue(['DDDDD-DDDDD']);
		const target = mountSection();
		await waitForSelector(target, '#mfa-enable-totp');

		target.querySelector<HTMLButtonElement>('#mfa-enable-totp')?.click();
		flushSync();

		await waitForSelector(target, '#totp-enroll-modal');
		expect(target.querySelector('#totp-enroll-modal')?.textContent).toContain('ABCD2345ABCD2345');

		mocks.fetchMfaState.mockResolvedValue(stateWithEmail);
		setInputValue(target, '#totp-enroll-code-0', '123456');
		target
			.querySelector('#totp-enroll-code-0')
			?.closest('form')
			?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
		flushSync();

		await waitForSelector(target, '#recovery-codes-modal');
		expect(mocks.verifyTotpEnrollment).toHaveBeenCalledWith('123456');
		expect(target.querySelector('#recovery-codes-modal')?.textContent).toContain('DDDDD-DDDDD');
	});

	it('la validation du code affiche les codes de récupération à la première méthode', async () => {
		mocks.verifyEmailEnrollment.mockResolvedValue(['AAAAA-AAAAA', 'BBBBB-BBBBB']);
		const target = mountSection();
		await waitForSelector(target, '#mfa-enable-email');
		target.querySelector<HTMLButtonElement>('#mfa-enable-email')?.click();
		await waitForSelector(target, '#mfa-enroll-code-0');

		mocks.fetchMfaState.mockResolvedValue(stateWithEmail);
		setInputValue(target, '#mfa-enroll-code-0', '123456');
		target
			.querySelector('#mfa-enroll-code-0')
			?.closest('form')
			?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
		flushSync();

		await waitForSelector(target, '#recovery-codes-modal');
		expect(mocks.verifyEmailEnrollment).toHaveBeenCalledWith('123456');
		expect(target.querySelector('#recovery-codes-modal')?.textContent).toContain('AAAAA-AAAAA');
		expect(target.querySelector('#recovery-codes-modal')?.textContent).toContain('BBBBB-BBBBB');
	});
});

describe('MfaSection — méthode active', () => {
	beforeEach(() => {
		mocks.fetchMfaState.mockResolvedValue(stateWithEmail);
	});

	it('affiche la méthode et le nombre de codes restants', async () => {
		const target = mountSection();
		await waitForSelector(target, '#mfa-disable-email');

		const text = target.querySelector('#mfa-section')?.textContent;
		expect(text).toContain('Code par e-mail');
		expect(text).toContain('7 codes de récupération restants');
	});

	it('désactive la méthode après confirmation puis recharge', async () => {
		const target = mountSection();
		await waitForSelector(target, '#mfa-disable-email');

		target.querySelector<HTMLButtonElement>('#mfa-disable-email')?.click();
		flushSync();

		await vi.waitFor(() => {
			expect(mocks.disableMfaMethod).toHaveBeenCalledWith('method-email');
			expect(mocks.fetchMfaState).toHaveBeenCalledTimes(2);
		});
	});

	it('ne désactive rien quand la confirmation est refusée', async () => {
		vi.spyOn(window, 'confirm').mockReturnValue(false);
		const target = mountSection();
		await waitForSelector(target, '#mfa-disable-email');

		target.querySelector<HTMLButtonElement>('#mfa-disable-email')?.click();
		flushSync();

		expect(mocks.disableMfaMethod).not.toHaveBeenCalled();
	});

	it('régénère les codes et les montre une fois', async () => {
		mocks.regenerateRecoveryCodes.mockResolvedValue(['CCCCC-CCCCC']);
		const target = mountSection();
		await waitForSelector(target, '#mfa-disable-email');

		const regenerate = Array.from(
			target.querySelectorAll<HTMLButtonElement>('#mfa-section button')
		).find((button) => button.textContent.includes('Régénérer'));
		regenerate?.click();
		flushSync();

		await waitForSelector(target, '#recovery-codes-modal');
		expect(target.querySelector('#recovery-codes-modal')?.textContent).toContain('CCCCC-CCCCC');

		const close = Array.from(
			target.querySelectorAll<HTMLButtonElement>('#recovery-codes-modal button')
		).find((button) => button.textContent.includes("J'ai enregistré"));
		close?.click();
		flushSync();
		expect(target.querySelector('#recovery-codes-modal')).toBeNull();
	});
});

describe('MfaSection — erreurs', () => {
	it("affiche l'erreur de chargement et permet de réessayer", async () => {
		mocks.fetchMfaState.mockRejectedValueOnce(new Error('Service indisponible'));
		const target = mountSection();

		await vi.waitFor(() => {
			flushSync();
			expect(target.querySelector('#mfa-section')?.textContent).toContain('Service indisponible');
		});

		const retry = Array.from(
			target.querySelectorAll<HTMLButtonElement>('#mfa-section button')
		).find((button) => button.textContent.includes('Réessayer'));
		retry?.click();
		flushSync();

		await waitForSelector(target, '#mfa-enable-email');
	});
});

describe('MfaSection - passkeys', () => {
	it('propose Activer sans passkey puis enrôle via la modale de nommage', async () => {
		passkeyMocks.registerPasskey.mockResolvedValue({
			id: 'pk-1',
			recovery_codes: ['EEEEE-EEEEE']
		});
		const target = mountSection();
		await waitForSelector(target, '#mfa-enable-passkey');

		target.querySelector<HTMLButtonElement>('#mfa-enable-passkey')?.click();
		flushSync();
		await waitForSelector(target, '#passkey-name');

		setInputValue(target, '#passkey-name', 'Téléphone');
		target
			.querySelector('#passkey-name')
			?.closest('form')
			?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
		flushSync();

		await waitForSelector(target, '#recovery-codes-modal');
		expect(passkeyMocks.registerPasskey).toHaveBeenCalledWith('Téléphone');
		expect(target.querySelector('#recovery-codes-modal')?.textContent).toContain('EEEEE-EEEEE');
	});

	it('affiche Gérer avec au moins une passkey et ouvre la modale de gestion', async () => {
		mocks.fetchMfaState.mockResolvedValue(stateWithPasskey);
		const target = mountSection();
		await waitForSelector(target, '#mfa-manage-passkeys');
		expect(target.querySelector('#mfa-enable-passkey')).toBeNull();

		target.querySelector<HTMLButtonElement>('#mfa-manage-passkeys')?.click();
		flushSync();
		await waitForSelector(target, '#passkeys-manage-modal');
	});
});
