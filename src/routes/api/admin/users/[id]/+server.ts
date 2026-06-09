import type { Permission } from '$lib/permissions';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';

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
};

const updateProfileStatus = async (
	locals: App.Locals,
	userId: string,
	status: 'active' | 'disabled'
) => {
	return (await locals.supabase
		.from('profiles')
		.update({
			status,
			status_reason: status === 'disabled' ? 'disabled_by_admin' : null,
			status_updated_at: new Date().toISOString(),
			status_updated_by: locals.user?.id ?? null
		})
		.eq('id', userId)) as { data: unknown; error: { message: string } | null };
};

export const DELETE = async (event: RequestEvent) => {
	const { locals, params } = event;
	if (!(await requireEditMembers(locals))) {
		return json({ error: 'Not authorized' }, { status: 403 });
	}

	const userId = params.id;
	if (!userId) {
		return json({ error: 'Missing user id' }, { status: 400 });
	}

	try {
		const { error } = await updateProfileStatus(locals, userId, 'disabled');
		if (error) {
			return json({ error: error.message }, { status: 500 });
		}
		return json({ ok: true, status: 'disabled' });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to disable user';
		return json({ error: message }, { status: 500 });
	}
};

export const PATCH = async (event: RequestEvent) => {
	const { locals, params, request } = event;
	if (!(await requireEditMembers(locals))) {
		return json({ error: 'Not authorized' }, { status: 403 });
	}

	const userId = params.id;
	if (!userId) {
		return json({ error: 'Missing user id' }, { status: 400 });
	}

	const payload = (await request.json().catch(() => ({}))) as { status?: string };
	const status = payload.status;
	if (!['active', 'disabled'].includes(status ?? '')) {
		return json({ error: 'Invalid status' }, { status: 400 });
	}

	try {
		const { error } = await updateProfileStatus(locals, userId, status as 'active' | 'disabled');
		if (error) {
			return json({ error: error.message }, { status: 500 });
		}
		return json({ ok: true, status });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to update user status';
		return json({ error: message }, { status: 500 });
	}
};
