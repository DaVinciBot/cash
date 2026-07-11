import { describe, expect, it, vi } from 'vitest';

import { mount, unmount } from 'svelte';

vi.mock('$env/dynamic/public', () => ({ env: {} }));
vi.mock('$lib/supabaseClient', () => ({
	getSupabaseBrowserClient: () => ({})
}));

import ProfilePage from '../../src/routes/profile/+page.svelte';
import { userdata } from '../../src/lib/store';
import type { UserProfile } from '../../src/lib/types/profile';

const profile: UserProfile = {
	email: 'alice@example.com',
	name: 'Alice',
	avatar: 'https://example.com/avatar.png',
	id: 'user-1',
	projects: [],
	permissions: [],
	allProjects: null
};

describe('profile +page.svelte', () => {
	it('mounts without crashing when userdata is already set (client-side navigation)', () => {
		userdata.set(profile);

		const target = document.createElement('div');
		document.body.appendChild(target);

		let instance: Record<string, unknown> | undefined;
		expect(() => {
			instance = mount(ProfilePage, { target });
		}).not.toThrow();

		const usernameInput = target.querySelector<HTMLInputElement>('#username');
		expect(usernameInput?.value).toBe('Alice');

		if (instance) {
			void unmount(instance);
		}
		target.remove();
	});
});
