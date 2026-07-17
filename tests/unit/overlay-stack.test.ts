import { describe, expect, it } from 'vitest';

import {
	overlayCount,
	registerOverlay
} from '../../src/lib/components/overlay/overlay-stack.svelte';

describe('overlay-stack', () => {
	it('le premier overlay enregistré est au sommet', () => {
		const a = registerOverlay();
		expect(a.isTop).toBe(true);
		a.unregister();
		expect(overlayCount()).toBe(0);
	});

	it("un nouvel overlay prend le sommet, l'ancien le retrouve à la fermeture", () => {
		const a = registerOverlay();
		const b = registerOverlay();
		expect(a.isTop).toBe(false);
		expect(b.isTop).toBe(true);
		b.unregister();
		expect(a.isTop).toBe(true);
		a.unregister();
		expect(overlayCount()).toBe(0);
	});

	it("le retrait d'un overlay en milieu de pile ne change pas le sommet", () => {
		const a = registerOverlay();
		const b = registerOverlay();
		const c = registerOverlay();
		b.unregister();
		expect(c.isTop).toBe(true);
		expect(a.isTop).toBe(false);
		c.unregister();
		expect(a.isTop).toBe(true);
		a.unregister();
		expect(overlayCount()).toBe(0);
	});

	it('unregister est idempotent', () => {
		const a = registerOverlay();
		const b = registerOverlay();
		b.unregister();
		b.unregister();
		expect(overlayCount()).toBe(1);
		expect(a.isTop).toBe(true);
		a.unregister();
		expect(overlayCount()).toBe(0);
	});
});
