import { resolve } from '$app/paths';
import { buildLogoutUrl } from '$lib/config/auth';
import { redirectToLoginIfUnauthorized } from '$lib/settings/authGuard';
import { ElevationRequiredError, isElevationRequired } from '$lib/settings/stepUp';
import { userdata } from '$lib/store';
import { getSupabaseBrowserClient } from '$lib/supabaseClient';

export async function updateUsername(userId: string, username: string): Promise<void> {
	const supabase = getSupabaseBrowserClient();
	const { error } = await supabase.from('profiles').update({ username }).eq('id', userId);
	if (error) {
		throw new Error('Une erreur est survenue lors de la modification de votre nom');
	}
	userdata.update((user) => (user ? { ...user, name: username } : user));
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
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

	const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
	// l'upsert conserve la même URL publique : le suffixe force le rechargement de l'image
	const avatarUrl = `${urlData.publicUrl}?v=${String(Date.now())}`;

	const { error: updateError } = await supabase
		.from('profiles')
		.update({ avatar_url: avatarUrl })
		.eq('id', userId);
	if (updateError) {
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
