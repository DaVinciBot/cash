import { afterEach, describe, expect, it } from 'vitest';

import { flushSync, mount, unmount } from 'svelte';

import NewItemPage from '../../src/routes/items/new/+page.svelte';

/**
 * Régression : `bind:value` sur un `<input type="number">` écrit un NOMBRE
 * (ou `null` si le champ est vidé), jamais une chaîne. Tout `.replace()` posé
 * sur ces valeurs lançait un TypeError pendant le rendu, ce qui gelait la
 * réactivité : « Ajouter un composant » et « Retirer » ne répondaient plus dès
 * qu'un prix était saisi, et les totaux restaient figés.
 */

let cleanup: (() => void) | null = null;

const data = {
	projects: [
		{
			id: 1,
			name: 'Projet test',
			campus: 'nantes' as const,
			budgetId: null,
			needsChoice: false,
			diverges: false,
			budget: null
		}
	],
	memberCampus: 'nantes' as const,
	schoolYear: { id: 1, closedAt: null },
	partnerships: []
};

function mountPage(pageData: unknown = data) {
	const target = document.createElement('div');
	document.body.appendChild(target);
	const instance = mount(NewItemPage, {
		target,
		// Le composant ne lit que `data` et `form` ; le typage complet de PageData
		// n'apporte rien au test et masquerait la régression derrière du bruit.
		props: { data: pageData, form: null } as never
	});
	flushSync();
	cleanup = () => {
		void unmount(instance);
		target.remove();
	};
	return target;
}

const lines = (target: HTMLElement) => target.querySelectorAll('fieldset');

const fill = (target: HTMLElement, name: string, typed: string, index = 0) => {
	const input = [...target.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)].at(index);
	if (!input) {
		throw new Error(`Champ « ${name} » n° ${String(index)} introuvable.`);
	}
	input.value = typed;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
};

const buttonByText = (target: HTMLElement, label: string) =>
	[...target.querySelectorAll('button')].find((b) => b.textContent.includes(label));

/** Les montants sont formatés en euros français : espaces insécables compris. */
const normalise = (text: string) => text.replace(/\u202f|\u00a0/g, ' ');

afterEach(() => {
	cleanup?.();
	cleanup = null;
});

describe('panier de création de commande', () => {
	it("ajoute une ligne alors même qu'un prix unitaire a été saisi", () => {
		const target = mountPage();
		fill(target, 'unit_price_ttc', '12.5');

		buttonByText(target, 'Ajouter un composant')?.click();
		flushSync();

		expect(lines(target)).toHaveLength(2);
	});

	it("retire une ligne alors même qu'un prix unitaire a été saisi", () => {
		const target = mountPage();
		buttonByText(target, 'Ajouter un composant')?.click();
		flushSync();
		fill(target, 'unit_price_ttc', '12.5');

		[...target.querySelectorAll('button')].find((b) => b.textContent.includes('Retirer'))?.click();
		flushSync();

		expect(lines(target)).toHaveLength(1);
	});

	it('calcule le total ligne et le total général après saisie', () => {
		const target = mountPage();
		fill(target, 'unit_price_ttc', '12.5');
		fill(target, 'quantity', '3');

		expect(normalise(target.textContent)).toContain('Total ligne : 37,50 €');
		expect(normalise(target.textContent)).toContain('Total : 37,50 €');
	});

	it('recalcule le total sur plusieurs lignes', () => {
		const target = mountPage();
		fill(target, 'unit_price_ttc', '10');
		fill(target, 'quantity', '2');

		buttonByText(target, 'Ajouter un composant')?.click();
		flushSync();
		fill(target, 'unit_price_ttc', '5.5', 1);
		fill(target, 'quantity', '4', 1);

		expect(normalise(target.textContent)).toContain('Total : 42,00 €');
	});

	// Vider un champ numérique écrit `null`, pas `''` : le total doit le traiter
	// comme zéro au lieu de casser.
	it('traite un prix vidé comme zéro', () => {
		const target = mountPage();
		fill(target, 'unit_price_ttc', '12.5');
		fill(target, 'unit_price_ttc', '');

		expect(normalise(target.textContent)).toContain('Total : 0,00 €');
	});

	it('exige un lien pour chaque composant', () => {
		const target = mountPage();
		const link = target.querySelector<HTMLInputElement>('input[name="link"]');

		expect(link?.required).toBe(true);
	});

	// Le reste du budget suit le panier en direct : il était figé tant que le
	// calcul du total plantait au premier prix saisi.
	it('met à jour le budget restant à chaque modification du panier', () => {
		const target = mountPage({
			...data,
			projects: [
				{
					...data.projects[0],
					budget: {
						name: 'Budget test',
						allocatedTtc: 100,
						consumedTtc: 20,
						requestedTtc: 10,
						remainingTtc: 70
					}
				}
			]
		});
		expect(normalise(target.textContent)).toContain('Reste après ce panier : 70,00 €');

		fill(target, 'unit_price_ttc', '15');
		fill(target, 'quantity', '2');
		expect(normalise(target.textContent)).toContain('Reste après ce panier : 40,00 €');

		buttonByText(target, 'Ajouter un composant')?.click();
		flushSync();
		fill(target, 'unit_price_ttc', '50', 1);
		expect(normalise(target.textContent)).toContain('Reste après ce panier : -10,00 €');
		expect(target.textContent).toContain("dépasse l'enveloppe");

		[...target.querySelectorAll('button')]
			.filter((b) => b.textContent.includes('Retirer'))[1]
			?.click();
		flushSync();
		expect(normalise(target.textContent)).toContain('Reste après ce panier : 40,00 €');
	});
});
