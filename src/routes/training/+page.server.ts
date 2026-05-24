import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { session, user } = await locals.safeGetSession();

	if ((!session || !user) && !import.meta.env?.DEV) {
		redirect(302, `/auth/login?redirect=${encodeURIComponent(url.href)}`);
	}

	const { data, error } = await locals.supabase.rpc('has_permission', {
		p_permission: 'training.slot.cu'
	});

	if (error || !data) {
		redirect(302, `/unauthorized?redirect=${encodeURIComponent(url.href)}`);
	}

	return {
		isAdminAllowed: true
	};
};
