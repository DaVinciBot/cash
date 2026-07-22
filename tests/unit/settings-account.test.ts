import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { get } from 'svelte/store';

vi.mock('$env/dynamic/public', () => ({ env: {} }));

const mocks = vi.hoisted(() => {
	const updateEq = vi.fn();
	const update = vi.fn(() => ({ eq: updateEq }));
	const upload = vi.fn();
	const getPublicUrl = vi.fn();
	return { updateEq, update, upload, getPublicUrl };
});

vi.mock('@davincibot/lib/supabase', () => ({
	getSupabaseBrowserClient: () => ({
		from: () => ({ update: mocks.update }),
		storage: {
			from: () => ({ upload: mocks.upload, getPublicUrl: mocks.getPublicUrl })
		}
	})
}));

import { changePassword, updateUsername, uploadAvatar } from '@davincibot/lib/settings';
import { parseSettingsCategory } from '@davincibot/lib/settings';
import { userdata } from '@davincibot/lib';
import type { UserProfile } from '@davincibot/lib';

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
	it('met à jour profiles puis le store', async () => {
		mocks.updateEq.mockResolvedValue({ error: null });

		await updateUsername('user-1', 'Bob');

		expect(mocks.update).toHaveBeenCalledWith({ username: 'Bob' });
		expect(mocks.updateEq).toHaveBeenCalledWith('id', 'user-1');
		expect(get(userdata)?.name).toBe('Bob');
	});

	it('lève une erreur sans toucher au store en cas d’échec', async () => {
		mocks.updateEq.mockResolvedValue({ error: { message: 'nope' } });

		await expect(updateUsername('user-1', 'Bob')).rejects.toThrow();
		expect(get(userdata)?.name).toBe('Alice');
	});
});

describe('uploadAvatar', () => {
	it('upload puis met à jour avatar_url et le store avec un cache-buster', async () => {
		mocks.upload.mockResolvedValue({ error: null });
		mocks.getPublicUrl.mockReturnValue({
			data: { publicUrl: 'https://cdn.test/avatars/user-1/avatar.png' }
		});
		mocks.updateEq.mockResolvedValue({ error: null });

		const url = await uploadAvatar('user-1', new File(['x'], 'photo.png', { type: 'image/png' }));

		expect(mocks.upload).toHaveBeenCalledWith('user-1/avatar.png', expect.any(File), {
			cacheControl: '3600',
			upsert: true
		});
		expect(url).toMatch(/^https:\/\/cdn\.test\/avatars\/user-1\/avatar\.png\?v=\d+$/);
		expect(mocks.update).toHaveBeenCalledWith({ avatar_url: url });
		expect(get(userdata)?.avatar).toBe(url);
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
