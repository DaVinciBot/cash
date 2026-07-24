import { describe, expect, it, vi } from 'vitest';

import { flushSync, mount, unmount } from 'svelte';

vi.mock('$env/dynamic/public', () => ({ env: {} }));
vi.mock('@davincibot/lib/supabase', () => ({
	getSupabaseBrowserClient: () => ({})
}));
vi.mock('$app/state', () => ({
	page: { route: { id: '/' }, url: new URL('http://localhost/admin/') }
}));
vi.mock('$app/navigation', () => ({
	afterNavigate: vi.fn(),
	replaceState: vi.fn()
}));

import SettingsModal from '$lib/components/settings/SettingsModal.svelte';
import type { UserProfile } from '@davincibot/lib';
import { userdata } from '@davincibot/lib';
import Layout from '../../src/routes/+layout.svelte';

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

		const modalTarget = document.createElement('div');
		const layoutTarget = document.createElement('div');
		document.body.appendChild(modalTarget);
		document.body.appendChild(layoutTarget);

		// Le modal Paramètres lit userdata et écrit son propre $state quand il change.
		const modalInstance = mount(SettingsModal, {
			target: modalTarget,
			props: { initialCategory: null, onClose: () => undefined }
		});

		let layoutInstance: Record<string, unknown> | undefined;
		expect(() => {
			// Le $effect du layout appelle userdata.set(userProfile) et déclenche les abonnés.
			layoutInstance = mount(Layout, {
				target: layoutTarget,
				props: { data: layoutData as never }
			});
			flushSync();
		}).not.toThrow();

		void unmount(modalInstance);
		if (layoutInstance) {
			void unmount(layoutInstance);
		}
		modalTarget.remove();
		layoutTarget.remove();
	});
});
