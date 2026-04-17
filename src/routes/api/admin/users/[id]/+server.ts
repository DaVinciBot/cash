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
	if (!locals?.user?.id || !locals?.supabase) return [];
	const { data } = await locals.supabase
		.from('profiles')
		.select('permissions')
		.eq('id', locals.user.id)
		.single();
	return data?.permissions ?? [];
};

const requireEditMembers = async (locals: any) => {
	const permissions = await getPermissions(locals);
	return permissions.includes('edit_members');
};

export const DELETE = async (event: any) => {
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
		const { error } = await admin.auth.admin.deleteUser(userId);
		if (error) {
			return json({ error: error.message }, { status: 500 });
		}
		return json({ ok: true });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to delete user';
		return json({ error: message }, { status: 500 });
	}
};
