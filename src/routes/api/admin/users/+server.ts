import { env } from '$env/dynamic/private';
import { createClient } from '@supabase/supabase-js';
import { json } from '@sveltejs/kit';

const supabaseUrl = env.SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

const getAdminClient = () => {
	if (!supabaseUrl || !serviceRoleKey) {
		throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
	}
	return createClient(supabaseUrl, serviceRoleKey, {
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

export const GET = async (event: any) => {
	const { locals, url } = event;
	if (!(await requireEditMembers(locals))) {
		return json({ error: 'Not authorized' }, { status: 403 });
	}

	const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
	const perPage = Math.min(200, Math.max(1, Number(url.searchParams.get('perPage') ?? 100)));

	try {
		const admin = getAdminClient();
		const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
		if (error) {
			return json({ error: error.message }, { status: 500 });
		}
		return json({ users: data?.users ?? [], page, perPage });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to list users';
		return json({ error: message }, { status: 500 });
	}
};

export const POST = async (event: any) => {
	const { locals, request } = event;
	if (!(await requireEditMembers(locals))) {
		return json({ error: 'Not authorized' }, { status: 403 });
	}

	let payload: { email?: string } = {};
	try {
		payload = await request.json();
	} catch {
		return json({ error: 'Invalid JSON payload' }, { status: 400 });
	}

	const email = payload.email?.trim().toLowerCase();
	if (!email) {
		return json({ error: 'Missing email' }, { status: 400 });
	}

	try {
		const admin = getAdminClient();
		const { data, error } = await admin.auth.admin.inviteUserByEmail(email);
		if (error) {
			return json({ error: error.message }, { status: 500 });
		}
		return json({ user: data?.user ?? null });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to invite user';
		return json({ error: message }, { status: 500 });
	}
};
