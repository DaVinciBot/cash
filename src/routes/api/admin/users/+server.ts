import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { sidCookieName } from '$lib/server/authProxy';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { json } from '@sveltejs/kit';
import type { Database } from '@davincibot/database-types';
import type { RequestEvent } from './$types';

const getAdminClient = (): SupabaseClient<Database> => {
	const supabaseUrl = publicEnv.PUBLIC_SUPABASE_URL;
	if (!supabaseUrl) {
		throw new Error('Missing PUBLIC_SUPABASE_URL.');
	}
	const key = privateEnv.SUPABASE_SECRET_KEY;
	if (!key) {
		throw new Error('Missing SUPABASE_SECRET_KEY.');
	}
	return createClient<Database>(supabaseUrl, key, {
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

export const GET = async (event: RequestEvent) => {
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
		return json({ users: data.users, page, perPage });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to list users';
		return json({ error: message }, { status: 500 });
	}
};

export const POST = async (event: RequestEvent) => {
	const { request, cookies } = event;

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

	// Délégué au service auth : il re-vérifie la session (cookie sid forwardé) et
	// la permission members.invite.send, puis envoie l'invitation.
	const rawAuthBase = publicEnv.PUBLIC_AUTH_BASE_URL;
	const authBase = rawAuthBase ? rawAuthBase.replace(/\/$/, '') : 'https://auth.davincibot.fr';
	const sid = cookies.get(sidCookieName());
	const response = await fetch(`${authBase}/api/invitations`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...(sid ? { cookie: `${sidCookieName()}=${sid}` } : {})
		},
		body: JSON.stringify({ email })
	});
	const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;
	return json(result, { status: response.status });
};
