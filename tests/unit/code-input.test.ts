import { afterEach, describe, expect, it } from 'vitest';

import { flushSync, mount, unmount } from 'svelte';

import CodeInput from '../../src/lib/components/utils/CodeInput.svelte';

let cleanup: (() => void) | null = null;

function mountInput(props: { id: string; length?: number; disabled?: boolean }) {
	const target = document.createElement('div');
	document.body.appendChild(target);
	const state = { value: '' };
	const instance = mount(CodeInput, {
		target,
		props: {
			...props,
			get value() {
				return state.value;
			},
			set value(next: string) {
				state.value = next;
			}
		}
	});
	flushSync();
	cleanup = () => {
		void unmount(instance);
		target.remove();
	};
	return { target, state };
}

const cell = (target: HTMLElement, index: number) =>
	target.querySelector<HTMLInputElement>(`#otp-${String(index)}`);

const typeInCell = (target: HTMLElement, index: number, typed: string) => {
	const input = cell(target, index);
	expect(input).not.toBeNull();
	if (input) {
		input.value = typed;
		input.dispatchEvent(new Event('input', { bubbles: true }));
	}
	flushSync();
};

afterEach(() => {
	cleanup?.();
	cleanup = null;
});

describe('CodeInput', () => {
	it('rend une case par chiffre', () => {
		const { target } = mountInput({ id: 'otp' });
		expect(target.querySelectorAll('input')).toHaveLength(6);
		expect(cell(target, 0)?.getAttribute('autocomplete')).toBe('one-time-code');
	});

	it('taper un chiffre remplit la valeur et passe à la case suivante', () => {
		const { target, state } = mountInput({ id: 'otp' });
		typeInCell(target, 0, '4');
		expect(state.value).toBe('4');
		expect(document.activeElement).toBe(cell(target, 1));
	});

	it('coller un code complet distribue les 6 chiffres', () => {
		const { target, state } = mountInput({ id: 'otp' });
		typeInCell(target, 0, '123456');
		expect(state.value).toBe('123456');
		expect(cell(target, 3)?.value).toBe('4');
		expect(document.activeElement).toBe(cell(target, 5));
	});

	it('ignore ce qui n’est pas un chiffre', () => {
		const { target, state } = mountInput({ id: 'otp' });
		typeInCell(target, 0, '12a-3');
		expect(state.value).toBe('123');
	});

	it('backspace sur une case vide efface la précédente et y revient', () => {
		const { target, state } = mountInput({ id: 'otp' });
		typeInCell(target, 0, '12');
		const second = cell(target, 2);
		second?.focus();
		second?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
		flushSync();
		expect(state.value).toBe('1');
		expect(document.activeElement).toBe(cell(target, 1));
	});

	it('les flèches naviguent entre les cases', () => {
		const { target } = mountInput({ id: 'otp' });
		const first = cell(target, 0);
		first?.focus();
		first?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
		flushSync();
		expect(document.activeElement).toBe(cell(target, 1));
		cell(target, 1)?.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })
		);
		flushSync();
		expect(document.activeElement).toBe(cell(target, 0));
	});
});
