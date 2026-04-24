import { json } from '@sveltejs/kit';

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
	return permissions.some((permission: string) =>
		['members.profile.update.all', 'members.profile.status.update'].includes(permission)
	);
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
		const { error } = await locals.supabase
			.from('profiles')
			.update({
				status: 'disabled',
				status_reason: 'disabled_by_admin',
				status_updated_at: new Date().toISOString(),
				status_updated_by: locals?.user?.id ?? null
			})
			.eq('id', userId);
		if (error) {
			return json({ error: error.message }, { status: 500 });
		}
		return json({ ok: true, status: 'disabled' });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to disable user';
		return json({ error: message }, { status: 500 });
	}
};
