import { requireEditMembers } from '$lib/server/adminUsers';
import { publicEnv } from '@davincibot/lib';
import { sidCookieName } from '@davincibot/lib/server';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';

export const POST = async (event: RequestEvent) => {
	const { locals, params, cookies } = event;
	if (!(await requireEditMembers(locals))) {
		return json({ error: 'Not authorized' }, { status: 403 });
	}

	const userId = params.id;
	if (!userId) {
		return json({ error: 'Missing user id' }, { status: 400 });
	}

	// Délégué au service auth, comme l'invitation initiale : c'est lui qui pose le
	// `redirectTo` vers /sign-up. Sans lui, GoTrue retombe sur le Site URL et le
	// lien du mail mène à la page d'accueil au lieu du choix du mot de passe.
	const sid = cookies.get(sidCookieName());
	try {
		const response = await fetch(`${publicEnv.PUBLIC_AUTH_BASE_URL}/api/invitations/resend`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(sid ? { cookie: `${sidCookieName()}=${sid}` } : {})
			},
			body: JSON.stringify({ user_id: userId })
		});
		const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;
		return json(result, { status: response.status });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to reinvite user';
		return json({ error: message }, { status: 500 });
	}
};
