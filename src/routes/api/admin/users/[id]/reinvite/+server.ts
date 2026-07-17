import { env } from '$env/dynamic/public';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { json } from '@sveltejs/kit';
import type { Database } from '@davincibot/database-types';
import type { RequestEvent } from './$types';

const getAdminClient = async (locals: App.Locals): Promise<SupabaseClient<Database>> => {
	const supabaseUrl = env.PUBLIC_SUPABASE_URL;
	if (!supabaseUrl) {
		throw new Error('Missing PUBLIC_SUPABASE_URL.');
	}
	const result = (await locals.supabase.rpc('get_service_key')) as {
		data: string | null;
		error: { message: string } | null;
	};
	if (result.error || !result.data) {
		throw new Error(result.error?.message ?? 'Unable to fetch service key.');
	}
	return createClient(supabaseUrl, result.data, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
};

const requireEditMembers = async (locals: App.Locals): Promise<boolean> => {
	const [{ data: canUpdate }, { data: canStatusUpdate }] = await Promise.all([
		locals.supabase.rpc('has_permission', { p_permission: 'members.profile.update.all' }),
		locals.supabase.rpc('has_permission', { p_permission: 'members.profile.status.update' })
	]);
	return canUpdate === true || canStatusUpdate === true;
};

interface AdminUser {
	email?: string;
	email_confirmed_at?: string | null;
	invited_at?: string | null;
}

const reinvitePendingUserByEmail = async (admin: SupabaseClient<Database>, email: string) => {
	const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email);
	if (!inviteError) {
		return { method: 'invite' };
	}

	const normalizedMessage = inviteError.message.toLowerCase();
	const canFallbackToResend =
		normalizedMessage.includes('already') ||
		normalizedMessage.includes('registered') ||
		normalizedMessage.includes('exists');

	if (!canFallbackToResend) {
		throw new Error(inviteError.message);
	}

	const { error: resendError } = await admin.auth.resend({ type: 'signup', email });
	if (resendError) {
		throw new Error(resendError.message);
	}

	return { method: 'resend' };
};

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
		const admin = await getAdminClient(locals);
		const { data, error } = await admin.auth.admin.getUserById(userId);
		if (error) {
			return json({ error: error.message }, { status: 500 });
		}

		const targetUser = (data as { user?: AdminUser }).user;
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
