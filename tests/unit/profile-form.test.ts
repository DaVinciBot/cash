import { describe, expect, it, vi } from 'vitest';

import { flushSync, mount, unmount } from 'svelte';

vi.mock('$env/dynamic/public', () => ({ env: {} }));
vi.mock('@davincibot/lib/supabase', () => ({
	getSupabaseBrowserClient: () => ({})
}));

import RecordModal from '$lib/components/modals/RecordModal.svelte';
import { buildProfileFields, readProfileEdits } from '$lib/helpers/profileForm';

/**
 * La fiche membre traverse deux composants : RecordModal nomme ses contrôles à
 * partir des définitions de champs, la page relit la FormData. Le test monte
 * vraiment la modale : seul l'aller-retour complet prouve que les deux bouts
 * parlent de la même clé.
 */
function mountProfileModal(username: string, campus: string | null) {
	const target = document.createElement('div');
	document.body.appendChild(target);
	const fields = buildProfileFields();
	const values = {
		header: { title: 'Utilisateur', sub: '' },
		body: [
			{ label: 'Nom', id: fields[0]?.id, value: username },
			{ label: 'Campus', id: fields[1]?.id, value: campus ?? 'NULL' }
		]
	};
	const instance = mount(RecordModal, {
		target,
		props: { values, fields, id: 'test-profile' }
	});
	flushSync();

	const editButton = Array.from(target.querySelectorAll('button')).find((button) =>
		button.textContent.includes('Modifier')
	);
	if (!editButton) {
		throw new Error('Bouton « Modifier » introuvable');
	}
	editButton.click();
	flushSync();

	const form = target.querySelector('form');
	if (!form) {
		throw new Error('Formulaire de la fiche introuvable');
	}
	const cleanup = () => {
		void unmount(instance);
		target.remove();
	};
	return { target, form, cleanup };
}

describe('formulaire de la fiche membre', () => {
	it('relit le campus choisi dans la modale', () => {
		const { target, form, cleanup } = mountProfileModal('Alice', null);

		const campusSelect = target.querySelector<HTMLSelectElement>('select');
		if (!campusSelect) {
			throw new Error('Sélecteur de campus introuvable');
		}
		campusSelect.value = 'paris';
		campusSelect.dispatchEvent(new Event('change', { bubbles: true }));

		const edits = readProfileEdits(new FormData(form), { username: true, campus: true });

		expect(edits.campus).toBe('paris');

		cleanup();
	});

	it('relit le nom saisi dans la modale', () => {
		const { target, form, cleanup } = mountProfileModal('Alice', 'nantes');

		const nameInput = target.querySelector<HTMLInputElement>('input[type="text"]');
		if (!nameInput) {
			throw new Error('Champ nom introuvable');
		}
		nameInput.value = 'Alice Martin';
		nameInput.dispatchEvent(new Event('input', { bubbles: true }));

		const edits = readProfileEdits(new FormData(form), { username: true, campus: true });

		expect(edits.username).toBe('Alice Martin');
		// Le campus déjà posé doit ressortir tel quel, sinon rouvrir la fiche l'efface.
		expect(edits.campus).toBe('nantes');

		cleanup();
	});

	it("laisse le campus intact quand rien n'est choisi", () => {
		const { form, cleanup } = mountProfileModal('Alice', null);

		const edits = readProfileEdits(new FormData(form), { username: true, campus: true });

		// `undefined` = « ne touche pas » côté RPC : un campus absent ne s'efface pas.
		expect(edits.campus).toBeUndefined();

		cleanup();
	});

	it('ignore un champ non présenté', () => {
		const { form, cleanup } = mountProfileModal('Alice', 'paris');

		const edits = readProfileEdits(new FormData(form), { username: false, campus: false });

		expect(edits.username).toBeUndefined();
		expect(edits.campus).toBeUndefined();

		cleanup();
	});
});
