import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { flushSync, mount, unmount } from 'svelte';
import { get } from 'svelte/store';

vi.mock('$env/dynamic/public', () => ({ env: {} }));

const mocks = vi.hoisted(() => ({
	fetchMfaState: vi.fn(),
	startEmailEnrollment: vi.fn(),
	verifyEmailEnrollment: vi.fn(),
	disableMfaMethod: vi.fn(),
	regenerateRecoveryCodes: vi.fn(),
	stepUpChallenge: vi.fn(),
	stepUpVerify: vi.fn()
}));

vi.mock('$lib/settings/mfa', () => mocks);

import StepUpDialog from '../../src/lib/components/settings/StepUpDialog.svelte';
import { requestStepUp, stepUpRequest } from '$lib/settings/stepUp';

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
	mocks.stepUpChallenge.mockResolvedValue('email');
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
		await waitForSelector(target, '#step-up-code');
		expect(mocks.stepUpChallenge).toHaveBeenCalledTimes(1);

		setInputValue(target, '#step-up-code', '123456');
		submitForm(target, '#step-up-code');

		await expect(pending).resolves.toBe(true);
		expect(mocks.stepUpVerify).toHaveBeenCalledWith({ code: '123456' });
		await vi.waitFor(() => {
			flushSync();
			expect(target.querySelector('#step-up-dialog')).toBeNull();
		});
	});

	it('bascule vers un code de récupération', async () => {
		const target = mountDialog();
		const pending = requestStepUp();
		await waitForSelector(target, '#step-up-code');

		const toggle = Array.from(
			target.querySelectorAll<HTMLButtonElement>('#step-up-dialog button')
		).find((button) => button.textContent.includes('code de récupération'));
		toggle?.click();
		flushSync();

		await waitForSelector(target, '#step-up-recovery');
		setInputValue(target, '#step-up-recovery', 'AAAAA-BBBBB');
		submitForm(target, '#step-up-recovery');

		await expect(pending).resolves.toBe(true);
		expect(mocks.stepUpVerify).toHaveBeenCalledWith({ recovery_code: 'AAAAA-BBBBB' });
	});

	it('demande le mot de passe quand le compte est sans MFA', async () => {
		mocks.stepUpChallenge.mockResolvedValue('password');
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
		await waitForSelector(target, '#step-up-code');

		setInputValue(target, '#step-up-code', '000000');
		submitForm(target, '#step-up-code');

		await vi.waitFor(() => {
			flushSync();
			expect(target.querySelector('#step-up-dialog')?.textContent).toContain(
				'Vérification échouée.'
			);
		});
		expect(get(stepUpRequest)).not.toBe(null);
	});

	it("l'annulation résout false et ferme le dialogue", async () => {
		const target = mountDialog();
		const pending = requestStepUp();
		await waitForSelector(target, '#step-up-code');

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
