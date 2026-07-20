import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { flushSync, mount, unmount } from 'svelte';

vi.mock('$env/dynamic/public', () => ({ env: {} }));

const mocks = vi.hoisted(() => ({
	fetchPasskeys: vi.fn(),
	registerPasskey: vi.fn(),
	renamePasskey: vi.fn(),
	deletePasskey: vi.fn()
}));

vi.mock('@davincibot/lib/settings', () => mocks);

import PasskeysManageModal from '../../src/lib/components/modals/PasskeysManageModal.svelte';

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
const onClose = vi.fn();

function mountModal() {
	const target = document.createElement('div');
	document.body.appendChild(target);
	const instance = mount(PasskeysManageModal, { target, props: { onClose } });
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

describe('PasskeysManageModal', () => {
	it("liste les passkeys avec leur date d'ajout", async () => {
		const target = mountModal();
		await waitForSelector(target, '#passkey-row-pk-1');
		const text = target.querySelector('#passkeys-manage-modal')?.textContent;
		expect(text).toContain('MacBook du bureau');
		expect(text).toContain('Clé USB');
		expect(target.querySelector('#passkey-row-pk-1')?.textContent).not.toContain('Synchronisée');
		expect(target.querySelector('#passkey-row-pk-1')?.textContent).not.toContain('Ajoutée le');
	});

	it('affiche un état vide sans passkey', async () => {
		mocks.fetchPasskeys.mockResolvedValue([]);
		const target = mountModal();
		await vi.waitFor(() => {
			flushSync();
			expect(target.querySelector('#passkeys-manage-modal')?.textContent).toContain(
				'Aucune passkey'
			);
		});
	});

	it('ajoute une passkey via la modale de nommage puis recharge la liste', async () => {
		mocks.registerPasskey.mockResolvedValue({ id: 'pk-3', recovery_codes: null });
		const target = mountModal();
		// attend la fin du chargement : le bouton existe mais reste désactivé avant
		await waitForSelector(target, '#passkey-row-pk-1');

		target.querySelector<HTMLButtonElement>('#passkey-add')?.click();
		flushSync();
		await waitForSelector(target, '#passkey-name');

		setInputValue(target, '#passkey-name', 'Téléphone');
		submitForm(target, '#passkey-name');

		await vi.waitFor(() => {
			flushSync();
			expect(mocks.registerPasskey).toHaveBeenCalledWith('Téléphone');
			expect(mocks.fetchPasskeys).toHaveBeenCalledTimes(2);
		});
	});

	it('renomme une passkey depuis sa ligne (nom prérempli)', async () => {
		mocks.renamePasskey.mockResolvedValue(undefined);
		const target = mountModal();
		await waitForSelector(target, '#passkey-rename-pk-2');

		target.querySelector<HTMLButtonElement>('#passkey-rename-pk-2')?.click();
		flushSync();
		await waitForSelector(target, '#passkey-name');
		expect(target.querySelector<HTMLInputElement>('#passkey-name')?.value).toBe('Clé USB');

		setInputValue(target, '#passkey-name', 'Clé du labo');
		submitForm(target, '#passkey-name');

		await vi.waitFor(() => {
			flushSync();
			expect(mocks.renamePasskey).toHaveBeenCalledWith('pk-2', 'Clé du labo');
		});
	});

	it('supprime une passkey après confirmation et recharge', async () => {
		mocks.deletePasskey.mockResolvedValue(undefined);
		vi.spyOn(window, 'confirm').mockReturnValue(true);
		const target = mountModal();
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
		const target = mountModal();
		await waitForSelector(target, '#passkey-delete-pk-1');

		target.querySelector<HTMLButtonElement>('#passkey-delete-pk-1')?.click();
		flushSync();

		expect(mocks.deletePasskey).not.toHaveBeenCalled();
	});

	it('le bouton Fermer appelle onClose', async () => {
		const target = mountModal();
		await waitForSelector(target, '#passkey-row-pk-1');

		const close = Array.from(
			target.querySelectorAll<HTMLButtonElement>('#passkeys-manage-modal button')
		).find((button) => button.textContent.includes('Fermer'));
		close?.click();
		flushSync();

		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
