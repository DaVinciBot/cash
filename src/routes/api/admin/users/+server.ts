import { env } from '$env/dynamic/public';
import type { Permission } from '$lib/permissions';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';

const getAdminClient = async (locals: App.Locals): Promise<SupabaseClient> => {
	const supabaseUrl = env.PUBLIC_SUPABASE_URL;
	if (!supabaseUrl) {
		throw new Error('Missing PUBLIC_SUPABASE_URL.');
	}
	const { data, error } = (await locals.supabase.rpc('get_service_key')) as {
		data: string | null;
		error: { message: string } | null;
	};
	if (error || !data) {
		throw new Error(error?.message ?? 'Unable to fetch service key.');
	}
	return createClient(supabaseUrl, data, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
};

const getPermissions = async (locals: App.Locals): Promise<Permission[]> => {
	if (Array.isArray(locals.permissions) && locals.permissions.length > 0) {
		return locals.permissions;
	}
	if (!locals.user?.id) {
		return [];
	}
	const result = (await locals.supabase
		.from('profiles')
		.select('permissions')
		.eq('id', locals.user.id)
		.single()) as { data: { permissions: Permission[] } | null; error: unknown };
	return result.data?.permissions ?? [];
};

const requireEditMembers = async (locals: App.Locals): Promise<boolean> => {
	const permissions = await getPermissions(locals);
	return permissions.some((permission: string) =>
		['members.profile.update.all', 'members.profile.status.update'].includes(permission)
	);
}; //TODO: accès si on peut lire mais pas edit ?

export const GET = async (event: RequestEvent) => {
	const { locals, url } = event;
	if (!(await requireEditMembers(locals))) {
		return json({ error: 'Not authorized' }, { status: 403 });
	}

	const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
	const perPage = Math.min(200, Math.max(1, Number(url.searchParams.get('perPage') ?? 100)));

	try {
		const admin = await getAdminClient(locals);
		const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
		if (error) {
			return json({ error: error.message }, { status: 500 });
		}
		return json({ users: data.users, page, perPage });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to list users';
		return json({ error: message }, { status: 500 });
	}
};

export const POST = async (event: RequestEvent) => {
	const { locals, request } = event;
	if (!(await requireEditMembers(locals))) {
		return json({ error: 'Not authorized' }, { status: 403 });
	}

	let email: string | undefined;
	try {
		const payload = (await request.json()) as { email?: string };
		email = payload.email?.trim().toLowerCase();
	} catch {
		return json({ error: 'Invalid JSON payload' }, { status: 400 });
	}

	if (!email) {
		return json({ error: 'Missing email' }, { status: 400 });
	}

	try {
		const admin = await getAdminClient(locals);
		const { data, error } = await admin.auth.admin.inviteUserByEmail(email);
		if (error) {
			return json({ error: error.message }, { status: 500 });
		}
		return json({ user: data.user });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to invite user';
		return json({ error: message }, { status: 500 });
	}
};
