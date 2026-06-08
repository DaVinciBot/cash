import { env } from '$env/dynamic/public';
import { createClient } from '@supabase/supabase-js';
import { json } from '@sveltejs/kit';

const getAdminClient = async (locals: any) => {
	const supabaseUrl = env.PUBLIC_SUPABASE_URL;
	if (!supabaseUrl) {
		throw new Error('Missing PUBLIC_SUPABASE_URL.');
	}
	const { data, error } = await locals.supabase.rpc('get_service_key');
	if (error || !data) {
		throw new Error(error?.message || 'Unable to fetch service key.');
	}
	return createClient(supabaseUrl, data, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
};

const getPermissions = async (locals: any) => {
	if (Array.isArray(locals?.permissions) && locals.permissions.length > 0) {
		return locals.permissions;
	}
	if (!locals?.user?.id || !locals?.supabase) {
		return [];
	}
	const { data } = await locals.supabase
		.from('profiles')
		.select('permissions')
		.eq('id', locals.user.id)
		.single();
	return data?.permissions ?? [];
};

const requireEditMembers = async (locals: any) => {
	const permissions = await getPermissions(locals);
	return permissions.some((permission: string) =>
		['members.profile.update.all', 'members.profile.status.update'].includes(permission)
	);
}; //TODO: accès si on peut lire mais pas edit ?

const reinvitePendingUserByEmail = async (admin: any, email: string) => {
	const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email);
	if (!inviteError) {
		return { method: 'invite' };
	}

	const normalizedMessage = (inviteError.message || '').toLowerCase();
	const canFallbackToResend =
		normalizedMessage.includes('already') ||
		normalizedMessage.includes('registered') ||
		normalizedMessage.includes('exists');

	if (!canFallbackToResend) {
		throw new Error(inviteError.message || 'Failed to invite user');
	}

	const { error: resendError } = await admin.auth.resend({ type: 'signup', email });
	if (resendError) {
		throw new Error(resendError.message || inviteError.message || 'Failed to resend invitation');
	}

	return { method: 'resend' };
};

export const POST = async (event: any) => {
	const { locals, params } = event;
	if (!(await requireEditMembers(locals))) {
		return json({ error: 'Not authorized' }, { status: 403 });
	}

	const userId = params?.id;
	if (!userId) {
		return json({ error: 'Missing user id' }, { status: 400 });
	}

	try {
		const admin = await getAdminClient(locals);
		const { data, error } = await admin.auth.admin.getUserById(userId);
		if (error) {
			return json({ error: error.message }, { status: 500 });
		}

		const targetUser = data?.user;
		if (!targetUser) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		const email = targetUser.email?.trim().toLowerCase();
		if (!email) {
			return json({ error: 'Target user has no email' }, { status: 400 });
		}

		if (targetUser.email_confirmed_at) {
			return json({ error: 'Email already confirmed' }, { status: 409 });
		}

		if (!targetUser.invited_at) {
			return json({ error: 'User is not a pending admin invitation' }, { status: 409 });
		}

		const result = await reinvitePendingUserByEmail(admin, email);

		return json({
			ok: true,
			userId,
			email,
			method: result.method
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to reinvite user';
		return json({ error: message }, { status: 500 });
	}
};
