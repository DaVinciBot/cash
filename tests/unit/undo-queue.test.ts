import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UndoQueue } from '../../src/lib/undoQueue.svelte';

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('UndoQueue', () => {
	it("n'exécute l'action qu'à l'expiration du délai", async () => {
		const queue = new UndoQueue(1000);
		const commit = vi.fn(() => Promise.resolve());

		queue.schedule('1', 'Composant retiré', commit);
		expect(queue.has('1')).toBe(true);

		await vi.advanceTimersByTimeAsync(999);
		expect(commit).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		expect(commit).toHaveBeenCalledOnce();
		expect(queue.has('1')).toBe(false);
	});

	it("n'envoie rien quand on annule", async () => {
		const queue = new UndoQueue(1000);
		const commit = vi.fn(() => Promise.resolve());

		queue.schedule('1', 'Composant retiré', commit);
		queue.undo('1');
		await vi.advanceTimersByTimeAsync(2000);

		expect(commit).not.toHaveBeenCalled();
		expect(queue.pending).toEqual([]);
	});

	it('ignore une deuxième demande sur le même élément', async () => {
		const queue = new UndoQueue(1000);
		const commit = vi.fn(() => Promise.resolve());

		queue.schedule('1', 'Composant retiré', commit);
		queue.schedule('1', 'Composant retiré', commit);
		await vi.advanceTimersByTimeAsync(1000);

		expect(commit).toHaveBeenCalledOnce();
	});

	it('exécute tout de suite ce qui attend quand on quitte la page', async () => {
		const queue = new UndoQueue(1000);
		const first = vi.fn(() => Promise.resolve());
		const second = vi.fn(() => Promise.resolve());

		queue.schedule('1', 'Premier', first);
		queue.schedule('2', 'Second', second);
		queue.flush();
		await vi.advanceTimersByTimeAsync(0);

		expect(first).toHaveBeenCalledOnce();
		expect(second).toHaveBeenCalledOnce();
		await vi.advanceTimersByTimeAsync(2000);
		expect(first).toHaveBeenCalledOnce();
	});

	it("passe par le beacon à la fermeture de l'onglet", () => {
		const queue = new UndoQueue(1000);
		const commit = vi.fn(() => Promise.resolve());
		const beacon = vi.fn();

		queue.schedule('1', 'Composant retiré', commit, beacon);
		queue.flushOnUnload();

		expect(beacon).toHaveBeenCalledOnce();
		expect(commit).not.toHaveBeenCalled();
		expect(queue.pending).toEqual([]);
	});
});
