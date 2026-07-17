import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { flushSync, mount, unmount } from 'svelte';

vi.mock('$env/dynamic/public', () => ({ env: {} }));

const mocks = vi.hoisted(() => ({
	fetchPasskeys: vi.fn(),
	registerPasskey: vi.fn(),
	renamePasskey: vi.fn(),
	deletePasskey: vi.fn()
}));

vi.mock('$lib/settings/passkeys', () => mocks);

import PasskeysSection from '../../src/lib/components/settings/PasskeysSection.svelte';

const PASSKEYS = [
	{
		id: 'pk-1',
		friendly_name: 'MacBook du bureau',
		device_type: 'multiDevice',
		backed_up: true,
		created_at: '2026-07-01T10:00:00Z',
		last_used_at: '2026-07-16T08:00:00Z'
	},
	{
		id: 'pk-2',
		friendly_name: 'Clé USB',
		device_type: 'singleDevice',
		backed_up: false,
		created_at: '2026-07-02T10:00:00Z',
		last_used_at: null
	}
];

let cleanup: (() => void) | null = null;

function mountSection() {
	const target = document.createElement('div');
	document.body.appendChild(target);
	const instance = mount(PasskeysSection, { target });
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
	// jsdom n'expose pas WebAuthn : simule un navigateur compatible.
	vi.stubGlobal('PublicKeyCredential', {});
	mocks.fetchPasskeys.mockResolvedValue(PASSKEYS);
});

afterEach(() => {
	cleanup?.();
	cleanup = null;
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('PasskeysSection', () => {
	it('liste les passkeys avec badge synchronisée', async () => {
		const target = mountSection();
		await waitForSelector(target, '#passkey-row-pk-1');
		expect(target.querySelector('#passkeys-section')?.textContent).toContain('MacBook du bureau');
		expect(target.querySelector('#passkeys-section')?.textContent).toContain('Clé USB');
		expect(target.querySelector('#passkey-row-pk-1')?.textContent).toContain('Synchronisée');
		expect(target.querySelector('#passkey-row-pk-2')?.textContent).not.toContain('Synchronisée');
	});

	it('affiche un état vide sans passkey', async () => {
		mocks.fetchPasskeys.mockResolvedValue([]);
		const target = mountSection();
		await vi.waitFor(() => {
			flushSync();
			expect(target.querySelector('#passkeys-section')?.textContent).toContain('Aucune passkey');
		});
	});

	it('ajoute une passkey via la modale de nommage et affiche les codes de récupération', async () => {
		mocks.registerPasskey.mockResolvedValue({ id: 'pk-3', recovery_codes: ['AAAAA-BBBBB'] });
		const target = mountSection();
		await waitForSelector(target, '#passkey-add');

		target.querySelector<HTMLButtonElement>('#passkey-add')?.click();
		flushSync();
		await waitForSelector(target, '#passkey-name');

		setInputValue(target, '#passkey-name', 'Téléphone');
		submitForm(target, '#passkey-name');

		await vi.waitFor(() => {
			flushSync();
			expect(mocks.registerPasskey).toHaveBeenCalledWith('Téléphone');
			expect(target.querySelector('#recovery-codes-modal')).not.toBeNull();
		});
		expect(target.textContent).toContain('AAAAA-BBBBB');
	});

	it('renomme une passkey depuis sa ligne', async () => {
		mocks.renamePasskey.mockResolvedValue(undefined);
		const target = mountSection();
		await waitForSelector(target, '#passkey-rename-pk-2');

		target.querySelector<HTMLButtonElement>('#passkey-rename-pk-2')?.click();
		flushSync();
		await waitForSelector(target, '#passkey-name');
		const input = target.querySelector<HTMLInputElement>('#passkey-name');
		expect(input?.value).toBe('Clé USB');

		setInputValue(target, '#passkey-name', 'Clé du labo');
		submitForm(target, '#passkey-name');

		await vi.waitFor(() => {
			flushSync();
			expect(mocks.renamePasskey).toHaveBeenCalledWith('pk-2', 'Clé du labo');
		});
	});

	it('supprime une passkey après confirmation', async () => {
		mocks.deletePasskey.mockResolvedValue(undefined);
		vi.spyOn(window, 'confirm').mockReturnValue(true);
		const target = mountSection();
		await waitForSelector(target, '#passkey-delete-pk-1');

		target.querySelector<HTMLButtonElement>('#passkey-delete-pk-1')?.click();
		flushSync();

		await vi.waitFor(() => {
			flushSync();
			expect(mocks.deletePasskey).toHaveBeenCalledWith('pk-1');
			expect(mocks.fetchPasskeys).toHaveBeenCalledTimes(2);
		});
	});

	it("annule la suppression si l'utilisateur refuse la confirmation", async () => {
		vi.spyOn(window, 'confirm').mockReturnValue(false);
		const target = mountSection();
		await waitForSelector(target, '#passkey-delete-pk-1');

		target.querySelector<HTMLButtonElement>('#passkey-delete-pk-1')?.click();
		flushSync();

		expect(mocks.deletePasskey).not.toHaveBeenCalled();
	});
});
