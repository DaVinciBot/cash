import { describe, expect, it, vi } from 'vitest';

import { flushSync, mount, unmount } from 'svelte';

vi.mock('$env/dynamic/public', () => ({ env: {} }));
vi.mock('$lib/supabaseClient', () => ({
	getSupabaseBrowserClient: () => ({})
}));
vi.mock('$app/state', () => ({
	page: { route: { id: '/profile' }, url: new URL('http://localhost/admin/profile/') }
}));

import Layout from '../../src/routes/+layout.svelte';
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

const layoutData = {
	session: { access_token: '', refresh_token: '' },
	user: null,
	cookies: [],
	userProfile: profile,
	permissions: [],
	canCreateOrder: false,
	menu: [{ title: 'Mes commandes', uri: '/admin', icon: 'home-outline' }]
};

describe('+layout.svelte / synchronisation du store userdata', () => {
	it('ne boucle pas quand un abonné de userdata écrit du state pendant le $effect du layout', () => {
		userdata.set(null);

		const pageTarget = document.createElement('div');
		const layoutTarget = document.createElement('div');
		document.body.appendChild(pageTarget);
		document.body.appendChild(layoutTarget);

		// La page profil s'abonne à userdata et écrit son propre $state dans le callback.
		const pageInstance = mount(ProfilePage, { target: pageTarget });

		let layoutInstance: Record<string, unknown> | undefined;
		expect(() => {
			// Le $effect du layout appelle userdata.set(userProfile) et déclenche les abonnés.
			layoutInstance = mount(Layout, {
				target: layoutTarget,
				props: { data: layoutData as never }
			});
			flushSync();
		}).not.toThrow();

		void unmount(pageInstance);
		if (layoutInstance) {
			void unmount(layoutInstance);
		}
		pageTarget.remove();
		layoutTarget.remove();
	});
});
