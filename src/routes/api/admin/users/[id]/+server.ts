import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';

const requireEditMembers = async (locals: App.Locals): Promise<boolean> => {
	const [{ data: canUpdate }, { data: canStatusUpdate }] = await Promise.all([
		locals.supabase.rpc('has_permission', { p_permission: 'members.profile.update.all' }),
		locals.supabase.rpc('has_permission', { p_permission: 'members.profile.status.update' })
	]);
	return canUpdate === true || canStatusUpdate === true;
};

const updateProfileStatus = async (
	locals: App.Locals,
	userId: string,
	status: 'active' | 'disabled'
) => {
	return (await locals.supabase.rpc('set_profile_status', {
		p_profile: userId,
		p_status: status,
		p_reason: status === 'disabled' ? 'disabled_by_admin' : undefined
	})) as { data: unknown; error: { message: string } | null };
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
