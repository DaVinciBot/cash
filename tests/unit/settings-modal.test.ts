import { beforeEach, describe, expect, it, vi } from 'vitest';

import { flushSync, mount, unmount } from 'svelte';

vi.mock('$env/dynamic/public', () => ({ env: {} }));
vi.mock('@davincibot/lib/supabase', () => ({
	getSupabaseBrowserClient: () => ({})
}));

import SettingsModal from '$lib/components/settings/SettingsModal.svelte';
import type { SettingsCategory } from '$lib/settings';
import type { UserProfile } from '@davincibot/lib';
import { userdata } from '@davincibot/lib';

const profile: UserProfile = {
	email: 'alice@example.com',
	name: 'Alice',
	avatar: 'https://example.com/avatar.png',
	id: 'user-1',
	campus: null,
	projects: [{ id: 1, name: 'Eurobot', campus: 'nantes', role: 'Membre' }],
	permissions: [],
	allProjects: null
};

function mountModal(initialCategory: SettingsCategory | null = null) {
	const target = document.createElement('div');
	document.body.appendChild(target);
	const onClose = vi.fn();
	const instance = mount(SettingsModal, { target, props: { initialCategory, onClose } });
	flushSync();
	const cleanup = () => {
		void unmount(instance);
		target.remove();
	};
	return { target, onClose, cleanup };
}

function findCategoryButton(target: HTMLElement, label: string): HTMLButtonElement {
	const buttons = Array.from(
		target.querySelectorAll<HTMLButtonElement>('#settings-categories button')
	);
	const button = buttons.find((b) => b.textContent.includes(label));
	if (!button) {
		throw new Error(`Bouton de catégorie « ${label} » introuvable`);
	}
	return button;
}

describe('SettingsModal', () => {
	beforeEach(() => {
		userdata.set(profile);
	});

	it("affiche l'onglet Profil avec les données du store", () => {
		const { target, cleanup } = mountModal();

		const usernameInput = target.querySelector<HTMLInputElement>('#username');
		expect(usernameInput?.value).toBe('Alice');
		expect(target.querySelector('#profile-email')?.textContent).toContain('alice@example.com');
		expect(target.querySelector('#profile-projects')?.textContent).toContain('Eurobot');

		cleanup();
	});

	it("bascule sur l'onglet Sécurité au clic dans la sidebar", () => {
		const { target, cleanup } = mountModal();

		findCategoryButton(target, 'Sécurité').click();
		flushSync();

		expect(target.querySelector('#password')).not.toBeNull();
		expect(target.querySelector('#password-confirm')).not.toBeNull();
		expect(target.querySelector('#username')).toBeNull();

		cleanup();
	});

	it('bascule sur le panneau Signaler un problème au clic dans la sidebar', () => {
		const { target, cleanup } = mountModal();

		findCategoryButton(target, 'Signaler un problème').click();
		flushSync();

		expect(target.querySelector('#report-type')).not.toBeNull();
		expect(target.querySelector('#report-title')).not.toBeNull();
		expect(target.querySelector('#report-description')).not.toBeNull();
		expect(target.querySelector('#username')).toBeNull();

		cleanup();
	});

	it('appelle onClose sur Escape', () => {
		const { onClose, cleanup } = mountModal();

		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		flushSync();

		expect(onClose).toHaveBeenCalledTimes(1);
		cleanup();
	});

	it("sans catégorie initiale, l'état mobile affiche la liste puis le panneau avec retour", () => {
		const { target, cleanup } = mountModal(null);

		const nav = target.querySelector('#settings-categories');
		const panel = target.querySelector('#settings-panel');
		expect(nav?.classList.contains('flex')).toBe(true);
		expect(panel?.classList.contains('hidden')).toBe(true);

		findCategoryButton(target, 'Profil').click();
		flushSync();
		expect(nav?.classList.contains('hidden')).toBe(true);
		expect(panel?.classList.contains('flex')).toBe(true);

		// bouton retour (premier bouton du panneau) → revient à la liste
		panel?.querySelector('button')?.click();
		flushSync();
		expect(nav?.classList.contains('flex')).toBe(true);
		expect(panel?.classList.contains('hidden')).toBe(true);

		cleanup();
	});

	it('avec une catégorie initiale (deep-link), le panneau est directement ouvert', () => {
		const { target, cleanup } = mountModal('securite');

		expect(target.querySelector('#settings-panel')?.classList.contains('flex')).toBe(true);
		expect(target.querySelector('#password')).not.toBeNull();

		cleanup();
	});
});
