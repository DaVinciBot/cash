import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { flushSync, mount, unmount } from 'svelte';

import MyItemsPage from '../../src/routes/+page.svelte';

/**
 * Retirer un composant de « Mes items » ne part pas tout de suite : l'item
 * disparaît, un toast propose « Annuler », et la suppression n'est envoyée
 * qu'à l'expiration du délai.
 */

let cleanup: (() => void) | null = null;

const item = (id: number, name: string) => ({
	id,
	name,
	link: 'https://example.com',
	unitPriceTtc: 1,
	quantity: 1,
	totalTtc: 1,
	tags: ['info'],
	note: null,
	state: 'pending_cdp' as const,
	campus: 'nantes' as const,
	projectId: 1,
	projectName: 'Projet test',
	refusedReason: null,
	createdAt: '2026-11-01T10:00:00Z'
});

function mountPage() {
	const target = document.createElement('div');
	document.body.appendChild(target);
	const instance = mount(MyItemsPage, {
		target,
		props: { data: { items: [item(1, 'Résistance'), item(2, 'Moteur')] }, form: null } as never
	});
	flushSync();
	cleanup = () => {
		void unmount(instance);
		target.remove();
	};
	return target;
}

const listed = (target: HTMLElement) =>
	[...target.querySelectorAll('li')].map((li) => li.textContent).join(' ');

const buttons = (label: string) =>
	[...document.body.querySelectorAll('button')].filter((b) => b.textContent.includes(label));

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
	vi.useFakeTimers();
	fetchMock = vi.fn(() =>
		Promise.resolve(new Response(JSON.stringify({ type: 'success', status: 200 })))
	);
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	cleanup?.();
	cleanup = null;
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

describe("suppression d'un composant dans « Mes items »", () => {
	it("masque l'item et propose de revenir en arrière", () => {
		const target = mountPage();
		buttons('Supprimer')[0]?.click();
		flushSync();

		expect(listed(target)).not.toContain('Résistance');
		expect(document.body.textContent).toContain('« Résistance » retiré de vos demandes.');

		buttons('Annuler')[0]?.click();
		flushSync();

		expect(listed(target)).toContain('Résistance');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("envoie la suppression à l'expiration du délai", async () => {
		mountPage();
		buttons('Supprimer')[0]?.click();
		flushSync();

		await vi.advanceTimersByTimeAsync(6000);

		expect(fetchMock).toHaveBeenCalledOnce();
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toContain('?/delete');
		expect((init.body as FormData).get('id')).toBe('1');
	});
});
