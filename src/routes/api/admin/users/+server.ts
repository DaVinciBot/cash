import { getAdminClient, requireEditMembers } from '$lib/server/adminUsers';
import { publicEnv } from '@davincibot/lib';
import { sidCookieName } from '@davincibot/lib/server';
import type { RequestEvent } from './$types';

export const GET = async (event: RequestEvent) => {
	const { locals, url } = event;
	if (!(await requireEditMembers(locals))) {
		return Response.json({ error: 'Not authorized' }, { status: 403 });
	}

	const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
	const perPage = Math.min(200, Math.max(1, Number(url.searchParams.get('perPage') ?? 100)));

	try {
		const admin = getAdminClient();
		const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
		if (error) {
			return Response.json({ error: error.message }, { status: 500 });
		}
		return Response.json({ users: data.users, page, perPage });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to list users';
		return Response.json({ error: message }, { status: 500 });
	}
};

export const POST = async (event: RequestEvent) => {
	const { request, cookies } = event;

	let email: string | undefined;
	try {
		const payload = (await request.json()) as { email?: string };
		email = payload.email?.trim().toLowerCase();
	} catch {
		return Response.json({ error: 'Invalid JSON payload' }, { status: 400 });
	}

	if (!email) {
		return Response.json({ error: 'Missing email' }, { status: 400 });
	}

	// Délégué au service auth : il re-vérifie la session (cookie sid forwardé) et
	// la permission members.invite.send, puis envoie l'invitation.
	const sid = cookies.get(sidCookieName());
	const response = await fetch(`${publicEnv.PUBLIC_AUTH_BASE_URL}/api/invitations`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...(sid ? { cookie: `${sidCookieName()}=${sid}` } : {})
		},
		body: JSON.stringify({ email })
	});
	const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;
	return Response.json(result, { status: response.status });
};
