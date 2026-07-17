import { describe, expect, it, vi } from 'vitest';

import { flushSync, mount, unmount } from 'svelte';

import OverlayBackdrop from '../../src/lib/components/overlay/OverlayBackdrop.svelte';
import { overlayCount } from '../../src/lib/components/overlay/overlay-stack.svelte';

function mountBackdrop(onClose?: (event: Event) => void) {
	const target = document.createElement('div');
	document.body.appendChild(target);
	const instance = mount(OverlayBackdrop, { target, props: { onClose } });
	flushSync();
	const cleanup = () => {
		void unmount(instance);
		flushSync();
		target.remove();
	};
	return { target, cleanup };
}

function backdropEl(target: HTMLElement): HTMLElement {
	const el = target.firstElementChild;
	if (!(el instanceof HTMLElement)) {
		throw new Error('Backdrop introuvable');
	}
	return el;
}

describe('OverlayBackdrop', () => {
	it('seul le backdrop au sommet est visible, le précédent redevient visible à la fermeture', () => {
		const first = mountBackdrop();
		expect(backdropEl(first.target).classList.contains('opacity-100')).toBe(true);

		const second = mountBackdrop();
		flushSync();
		expect(backdropEl(first.target).classList.contains('opacity-0')).toBe(true);
		expect(backdropEl(second.target).classList.contains('opacity-100')).toBe(true);

		second.cleanup();
		expect(backdropEl(first.target).classList.contains('opacity-100')).toBe(true);

		first.cleanup();
		expect(overlayCount()).toBe(0);
	});

	it('rend un bouton qui appelle onClose au clic quand la prop est fournie', () => {
		const onClose = vi.fn();
		const { target, cleanup } = mountBackdrop(onClose);

		const button = backdropEl(target);
		expect(button.tagName).toBe('BUTTON');
		button.click();
		expect(onClose).toHaveBeenCalledTimes(1);

		cleanup();
		expect(overlayCount()).toBe(0);
	});

	it('rend un div non interactif sans onClose', () => {
		const { target, cleanup } = mountBackdrop();
		expect(backdropEl(target).tagName).toBe('DIV');
		cleanup();
	});
});
