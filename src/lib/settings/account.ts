import { resolve } from '$app/paths';
import { env } from '$env/dynamic/public';
import { redirectToLoginIfUnauthorized } from '$lib/settings/authGuard';
import { ElevationRequiredError, isElevationRequired } from '$lib/settings/stepUp';
import { buildLogoutUrl, userdata } from '@davincibot/lib';
import { getSupabaseBrowserClient } from '@davincibot/lib/supabase';

export async function updateUsername(userId: string, username: string): Promise<void> {
	const supabase = getSupabaseBrowserClient();
	const { data, error } = await supabase.rpc('update_my_username', { p_username: username });
	if (error) {
		throw new Error('Une erreur est survenue lors de la modification de votre nom');
	}
	const saved = data;
	userdata.update((user) => (user ? { ...user, name: saved } : user));
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
	const supabaseUrl = (): string => {
		const url = env.PUBLIC_SUPABASE_URL;
		if (!url) {
			throw new Error('PUBLIC_SUPABASE_URL manquant');
		}
		return url;
	};
	const supabase = getSupabaseBrowserClient();
	const ext = file.name.split('.').pop() ?? 'jpg';
	const path = `${userId}/avatar.${ext}`;
	const { error } = await supabase.storage.from('avatars').upload(path, file, {
		cacheControl: '3600',
		upsert: true
	});
	if (error) {
		throw new Error(
			error.message === 'Request failed with status code 413'
				? 'Votre avatar est trop lourd (max 5 Mo)'
				: 'Une erreur est survenue lors de la modification de votre avatar'
		);
	}

	const { data: avatarUrl, error: updateError } = await supabase.rpc('update_my_avatar', {
		p_extension: ext,
		p_base_url: supabaseUrl()
	});
	if (updateError || !avatarUrl) {
		throw new Error('Une erreur est survenue lors de la modification de votre avatar');
	}

	userdata.update((user) => (user ? { ...user, avatar: avatarUrl } : user));
	return avatarUrl;
}

export async function logOut(): Promise<void> {
	try {
		await getSupabaseBrowserClient().auth.signOut();
	} catch {
		// ignore
	}
	userdata.set(null);
	window.location.href = buildLogoutUrl(window.location.origin);
}

export async function changePassword(password: string): Promise<void> {
	const response = await fetch(resolve('/api/account/password'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ password })
	});
	if (!response.ok) {
		redirectToLoginIfUnauthorized(response);
		const result = (await response.json().catch(() => ({}))) as { error?: string };
		if (isElevationRequired(response.status, result)) {
			throw new ElevationRequiredError();
		}
		throw new Error(
			result.error ?? 'Une erreur est survenue lors de la modification de votre mot de passe'
		);
	}
}
