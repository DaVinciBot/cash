import { getAdminClient, requireEditMembers } from '$lib/server/adminUsers';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';

interface AdminUser {
	email?: string;
	email_confirmed_at?: string | null;
	invited_at?: string | null;
}

export const POST = async (event: RequestEvent) => {
	const { locals, params } = event;
	if (!(await requireEditMembers(locals))) {
		return json({ error: 'Not authorized' }, { status: 403 });
	}

	const userId = params.id;
	if (!userId) {
		return json({ error: 'Missing user id' }, { status: 400 });
	}

	try {
		const admin = getAdminClient();
		const { data, error } = await admin.auth.admin.getUserById(userId);
		if (error) {
			return json({ error: error.message }, { status: 500 });
		}

		const targetUser = (data as { user?: AdminUser }).user;
		if (!targetUser) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		const email = targetUser.email?.trim().toLowerCase();

		// Mêmes garde-fous que la réinvitation : on n'annule que ce qui est encore
		// une invitation en attente, jamais un compte déjà utilisé.
		if (targetUser.email_confirmed_at) {
			return json({ error: 'Email already confirmed' }, { status: 409 });
		}

		if (!targetUser.invited_at) {
			return json({ error: 'User is not a pending admin invitation' }, { status: 409 });
		}

		// `profiles.id` référence `auth.users` en ON DELETE CASCADE, et member_of /
		// profile_global_roles cascadent depuis le profil : supprimer le compte auth
		// suffit à nettoyer toute la chaîne.
		const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
		if (deleteError) {
			return json({ error: deleteError.message }, { status: 500 });
		}

		return json({ ok: true, userId, email });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to cancel invitation';
		return json({ error: message }, { status: 500 });
	}
};
