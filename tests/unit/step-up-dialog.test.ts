import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { flushSync, mount, unmount } from 'svelte';
import { get } from 'svelte/store';

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
	stepUpVerify: vi.fn(),
	stepUpVerifyWebauthn: vi.fn()
}));

vi.mock('@davincibot/lib/settings', () => mocks);

import StepUpDialog from '$lib/components/settings/StepUpDialog.svelte';
import { requestStepUp, stepUpRequest } from '@davincibot/lib/settings';

let cleanup: (() => void) | null = null;

function mountDialog() {
	const target = document.createElement('div');
	document.body.appendChild(target);
	const instance = mount(StepUpDialog, { target });
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

const submitForm = (target: HTMLElement, selector: string) => {
	target
		.querySelector(selector)
		?.closest('form')
		?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
	flushSync();
};

beforeEach(() => {
	vi.clearAllMocks();
	mocks.stepUpChallenge.mockResolvedValue({
		method: 'email',
		methods: ['email'],
		email: 'clement@davincibot.fr'
	});
	mocks.stepUpVerify.mockResolvedValue(undefined);
});

afterEach(() => {
	stepUpRequest.set(null);
	cleanup?.();
	cleanup = null;
	vi.restoreAllMocks();
});

describe('StepUpDialog', () => {
	it("n'affiche rien sans demande en cours", () => {
		const target = mountDialog();
		expect(target.querySelector('#step-up-dialog')).toBeNull();
	});

	it('ouvre le dialogue, lance le challenge et valide un code email', async () => {
		const target = mountDialog();
		const pending = requestStepUp();
		await waitForSelector(target, '#step-up-code-0');
		expect(mocks.stepUpChallenge).toHaveBeenCalledTimes(1);
		expect(target.querySelector('#step-up-dialog')?.textContent).toContain('clement@davincibot.fr');

		setInputValue(target, '#step-up-code-0', '123456');
		submitForm(target, '#step-up-code-0');

		await expect(pending).resolves.toBe(true);
		expect(mocks.stepUpVerify).toHaveBeenCalledWith({ code: '123456', method: 'email' });
		await vi.waitFor(() => {
			flushSync();
			expect(target.querySelector('#step-up-dialog')).toBeNull();
		});
	});

	it('bascule vers un code de récupération via « Utiliser une autre méthode »', async () => {
		const target = mountDialog();
		const pending = requestStepUp();
		await waitForSelector(target, '#step-up-code-0');

		const other = Array.from(
			target.querySelectorAll<HTMLButtonElement>('#step-up-dialog button')
		).find((button) => button.textContent.includes('Utiliser une autre méthode'));
		other?.click();
		flushSync();

		const recoveryOption = Array.from(
			target.querySelectorAll<HTMLButtonElement>('#step-up-dialog button')
		).find((button) => button.textContent.includes('Code de récupération'));
		recoveryOption?.click();
		flushSync();

		await waitForSelector(target, '#step-up-recovery');
		setInputValue(target, '#step-up-recovery', 'AAAAA-BBBBB');
		submitForm(target, '#step-up-recovery');

		await expect(pending).resolves.toBe(true);
		expect(mocks.stepUpVerify).toHaveBeenCalledWith({ recovery_code: 'AAAAA-BBBBB' });
	});

	it('démarre sur le TOTP sans envoi et bascule vers l’e-mail via le menu', async () => {
		mocks.stepUpChallenge
			.mockResolvedValueOnce({ method: 'totp', methods: ['email', 'totp'], email: null })
			.mockResolvedValueOnce({
				method: 'email',
				methods: ['email', 'totp'],
				email: 'clement@davincibot.fr'
			});
		const target = mountDialog();
		const pending = requestStepUp();
		await waitForSelector(target, '#step-up-code-0');
		expect(target.querySelector('#step-up-dialog')?.textContent).toContain(
			"application d'authentification"
		);
		expect(mocks.stepUpChallenge).toHaveBeenCalledTimes(1);
		expect(mocks.stepUpChallenge).toHaveBeenCalledWith();

		const other = Array.from(
			target.querySelectorAll<HTMLButtonElement>('#step-up-dialog button')
		).find((button) => button.textContent.includes('Utiliser une autre méthode'));
		other?.click();
		flushSync();
		const emailOption = Array.from(
			target.querySelectorAll<HTMLButtonElement>('#step-up-dialog button')
		).find((button) => button.textContent.includes('Code reçu par e-mail'));
		emailOption?.click();
		flushSync();

		await vi.waitFor(() => {
			flushSync();
			expect(target.querySelector('#step-up-dialog')?.textContent).toContain(
				'clement@davincibot.fr'
			);
		});
		expect(mocks.stepUpChallenge).toHaveBeenCalledTimes(2);
		expect(mocks.stepUpChallenge).toHaveBeenLastCalledWith('email');

		setInputValue(target, '#step-up-code-0', '654321');
		submitForm(target, '#step-up-code-0');
		await expect(pending).resolves.toBe(true);
		expect(mocks.stepUpVerify).toHaveBeenCalledWith({ code: '654321', method: 'email' });
	});

	it('valide un code TOTP avec la bonne méthode', async () => {
		mocks.stepUpChallenge.mockResolvedValue({
			method: 'totp',
			methods: ['email', 'totp'],
			email: null
		});
		const target = mountDialog();
		const pending = requestStepUp();
		await waitForSelector(target, '#step-up-code-0');

		setInputValue(target, '#step-up-code-0', '123456');
		submitForm(target, '#step-up-code-0');

		await expect(pending).resolves.toBe(true);
		expect(mocks.stepUpVerify).toHaveBeenCalledWith({ code: '123456', method: 'totp' });
	});

	it('demande le mot de passe quand le compte est sans MFA', async () => {
		mocks.stepUpChallenge.mockResolvedValue({ method: 'password', methods: [], email: null });
		const target = mountDialog();
		const pending = requestStepUp();
		await waitForSelector(target, '#step-up-password');

		setInputValue(target, '#step-up-password', 'motdepasse');
		submitForm(target, '#step-up-password');

		await expect(pending).resolves.toBe(true);
		expect(mocks.stepUpVerify).toHaveBeenCalledWith({ password: 'motdepasse' });
	});

	it('affiche l’erreur du service et laisse la demande ouverte', async () => {
		mocks.stepUpVerify.mockRejectedValue(new Error('Vérification échouée.'));
		const target = mountDialog();
		void requestStepUp();
		await waitForSelector(target, '#step-up-code-0');

		setInputValue(target, '#step-up-code-0', '000000');
		submitForm(target, '#step-up-code-0');

		await vi.waitFor(() => {
			flushSync();
			expect(target.querySelector('#step-up-dialog')?.textContent).toContain(
				'Vérification échouée.'
			);
		});
		expect(get(stepUpRequest)).not.toBe(null);
	});

	it('démarre sur la passkey avec tentative automatique et résout la demande', async () => {
		mocks.stepUpChallenge.mockResolvedValue({
			method: 'webauthn',
			methods: ['email', 'webauthn'],
			email: null
		});
		mocks.stepUpVerifyWebauthn.mockResolvedValue(undefined);
		const target = mountDialog();
		const pending = requestStepUp();

		await expect(pending).resolves.toBe(true);
		expect(mocks.stepUpVerifyWebauthn).toHaveBeenCalledTimes(1);
		expect(mocks.stepUpVerify).not.toHaveBeenCalled();
		flushSync();
		expect(target.querySelector('#step-up-dialog')).toBeNull();
	});

	it('passkey annulée : silencieux, bouton de relance et bascule possibles', async () => {
		mocks.stepUpChallenge.mockResolvedValue({
			method: 'webauthn',
			methods: ['email', 'webauthn'],
			email: null
		});
		const cancelError = new Error('cancelled');
		cancelError.name = 'NotAllowedError';
		mocks.stepUpVerifyWebauthn.mockRejectedValueOnce(cancelError).mockResolvedValueOnce(undefined);

		const target = mountDialog();
		const pending = requestStepUp();
		await waitForSelector(target, '#step-up-passkey');
		// l'annulation du prompt ne s'affiche pas comme une erreur
		expect(target.querySelector('#step-up-dialog')?.textContent).not.toContain('erreur');
		// la bascule vers une autre méthode reste proposée
		expect(target.querySelector('#step-up-dialog')?.textContent).toContain(
			'Utiliser une autre méthode'
		);

		target.querySelector<HTMLButtonElement>('#step-up-passkey')?.click();
		flushSync();

		await expect(pending).resolves.toBe(true);
		expect(mocks.stepUpVerifyWebauthn).toHaveBeenCalledTimes(2);
	});

	it("l'annulation résout false et ferme le dialogue", async () => {
		const target = mountDialog();
		const pending = requestStepUp();
		await waitForSelector(target, '#step-up-code-0');

		const cancel = Array.from(
			target.querySelectorAll<HTMLButtonElement>('#step-up-dialog button')
		).find((button) => button.textContent.includes('Annuler'));
		cancel?.click();
		flushSync();

		await expect(pending).resolves.toBe(false);
		expect(mocks.stepUpVerify).not.toHaveBeenCalled();
		expect(target.querySelector('#step-up-dialog')).toBeNull();
	});
});
