import { get } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	hashCode,
	hideOnClickOutside,
	loadSettings,
	loadUserdata,
	saveSettings,
	userdata
} from '@davincibot/lib';

describe('utils helpers', () => {
	beforeEach(() => {
		userdata.set(null);
		window.localStorage.clear();
	});

	it('loadUserdata writes to userdata store', () => {
		loadUserdata(null);
		expect(get(userdata)).toBeNull();

		const mockUser = {
			id: 'u-1',
			email: '',
			name: '',
			avatar: '',
			campus: null,
			projects: [],
			permissions: [],
			allProjects: null
		};
		loadUserdata(mockUser);
		expect(get(userdata)).toEqual(mockUser);
	});

	it('loadSettings and saveSettings persist JSON values', () => {
		saveSettings('table', [{ id: 1 }]);
		expect(loadSettings('table')).toEqual([{ id: 1 }]);
	});

	it('loadSettings handles invalid JSON gracefully', () => {
		window.localStorage.setItem('settings_broken', '{broken');

		expect(loadSettings('broken')).toBeUndefined();
	});

	it('saveSettings handles storage errors gracefully', () => {
		const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('quota');
		});

		expect(() => {
			saveSettings('quota', { ok: true });
		}).not.toThrow();

		setItemSpy.mockRestore();
	});

	it('hashCode is deterministic for equal input', () => {
		expect(hashCode({ a: 1, b: 2 })).toBe(hashCode({ a: 1, b: 2 }));
		expect(hashCode({ a: 1, b: 2 })).not.toBe(hashCode({ a: 1, b: 3 }));
	});

	it('hideOnClickOutside triggers once when non permanent', () => {
		const element = document.createElement('div');
		Object.defineProperty(element, 'offsetWidth', { value: 10, configurable: true });
		document.body.appendChild(element);

		const onHide = vi.fn();
		hideOnClickOutside(element, onHide, false);

		document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		expect(onHide).toHaveBeenCalledTimes(1);
		element.remove();
	});

	it('hideOnClickOutside keeps listener when permanent', () => {
		const element = document.createElement('div');
		Object.defineProperty(element, 'offsetWidth', { value: 10, configurable: true });
		document.body.appendChild(element);

		const onHide = vi.fn();
		hideOnClickOutside(element, onHide, true);

		document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		expect(onHide).toHaveBeenCalledTimes(2);
		element.remove();
	});
});
