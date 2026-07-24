import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { get } from 'svelte/store';

const mocks = vi.hoisted(() => {
	const rpc = vi.fn();
	const upload = vi.fn();
	return { rpc, upload };
});

vi.mock('@davincibot/lib/supabase', () => ({
	getSupabaseBrowserClient: () => ({
		rpc: mocks.rpc,
		storage: {
			from: () => ({ upload: mocks.upload })
		}
	})
}));

import type { UserProfile } from '@davincibot/lib';
import { userdata } from '@davincibot/lib';
import {
	changePassword,
	parseSettingsCategory,
	updateUsername,
	uploadAvatar
} from '@davincibot/lib/settings';

const profile: UserProfile = {
	email: 'alice@example.com',
	name: 'Alice',
	avatar: 'https://example.com/avatar.png',
	id: 'user-1',
	projects: [],
	permissions: [],
	allProjects: null
};

beforeEach(() => {
	vi.clearAllMocks();
	userdata.set({ ...profile });
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('parseSettingsCategory', () => {
	it('accepte les slugs connus', () => {
		expect(parseSettingsCategory('profil')).toBe('profil');
		expect(parseSettingsCategory('securite')).toBe('securite');
	});

	it('tolère accents, casse et espaces', () => {
		expect(parseSettingsCategory(' Sécurité ')).toBe('securite');
		expect(parseSettingsCategory('PROFIL')).toBe('profil');
	});

	it('rejette les valeurs inconnues', () => {
		expect(parseSettingsCategory('autre')).toBeNull();
		expect(parseSettingsCategory('')).toBeNull();
	});
});

describe('updateUsername', () => {
	it('appelle le RPC puis met à jour le store', async () => {
		mocks.rpc.mockResolvedValue({ data: 'Bob', error: null });

		await updateUsername('user-1', 'Bob');

		expect(mocks.rpc).toHaveBeenCalledWith('update_my_username', { p_username: 'Bob' });
		expect(get(userdata)?.name).toBe('Bob');
	});

	it('lève une erreur sans toucher au store en cas d’échec', async () => {
		mocks.rpc.mockResolvedValue({ data: null, error: { message: 'nope' } });

		await expect(updateUsername('user-1', 'Bob')).rejects.toThrow();
		expect(get(userdata)?.name).toBe('Alice');
	});
});

describe('uploadAvatar', () => {
	it('upload puis met à jour avatar_url et le store via le RPC', async () => {
		const avatarUrl = 'https://cdn.test/avatars/user-1/avatar.png?v=123';
		mocks.upload.mockResolvedValue({ error: null });
		mocks.rpc.mockResolvedValue({ data: avatarUrl, error: null });

		const url = await uploadAvatar('user-1', new File(['x'], 'photo.png', { type: 'image/png' }));

		expect(mocks.upload).toHaveBeenCalledWith('user-1/avatar.png', expect.any(File), {
			cacheControl: '3600',
			upsert: true
		});
		expect(mocks.rpc).toHaveBeenCalledWith(
			'update_my_avatar',
			expect.objectContaining({ p_extension: 'png' })
		);
		expect(url).toBe(avatarUrl);
		expect(get(userdata)?.avatar).toBe(avatarUrl);
	});

	it('traduit l’erreur 413 en message lisible', async () => {
		mocks.upload.mockResolvedValue({
			error: { message: 'Request failed with status code 413' }
		});

		await expect(uploadAvatar('user-1', new File(['x'], 'a.png'))).rejects.toThrow('max 5 Mo');
	});
});

describe('changePassword', () => {
	it('résout quand la réponse est ok', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

		await expect(changePassword('secret')).resolves.toBeUndefined();
	});

	it('remonte le message d’erreur du serveur', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				json: () => Promise.resolve({ error: 'Mot de passe trop court' })
			})
		);

		await expect(changePassword('x')).rejects.toThrow('Mot de passe trop court');
	});
});
