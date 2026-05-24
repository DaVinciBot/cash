import {
	ADMIN_MENU,
	canAccessAdminPath,
	filterMenuByPermissions,
	hasAnyPermission
} from '$lib/permissions';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies, url }) => {
	const { safeGetSession, supabase } = locals as any;
	const { session, user } = await safeGetSession();

	if (!session && !import.meta.env?.DEV) {
		redirect(303, 'https://davincibot.fr');
	}

	let userProfile = null;
	let permissions: string[] = [];
	let canCreateOrder = false;
	let menu = filterMenuByPermissions(ADMIN_MENU, []);

	if (user?.id) {
		const { data, error } = await supabase
			.from('profiles')
			.select('username,avatar_url,permissions, member_of(role, project(id, name, debut))')
			.eq('id', user.id)
			.single();

		if (!error && data) {
			permissions = (data.permissions as string[]) || [];
			canCreateOrder =
				permissions.includes('orders.create.all') || permissions.includes('orders.cru.self');

			userProfile = {
				email: user.email || '',
				name: data.username || (user.email ? user.email.split('@')[0] : ''),
				avatar: data.avatar_url || 'https://avatar.iran.liara.run/public/boy',
				id: user.id,
				projects: ((data.member_of as any[]) || []).map((m: any) => ({
					id: m?.project?.id,
					name: m?.project?.name,
					debut: m?.project?.debut || '0000-00-00',
					role: m?.role || 'membre'
				})),
				permissions,
				allProjects: null as any[] | null
			};

			if (
				hasAnyPermission(permissions, [
					'orders.read.all',
					'finance.read',
					'members.profile.read.all',
					'finance.write',
					'members.profile.update.all',
					'projects.stats.read.all'
				])
			) {
				userProfile.projects.push({
					id: 0,
					name: 'Association',
					debut: '2014-09-01',
					role: 'association'
				}); //TODO: review

				const { data: projects, error: projectsError } = await supabase
					.from('projects')
					.select('id, name, debut');
				if (!projectsError) {
					userProfile.allProjects = (projects || []).map((p: any) => ({
						value: p.id,
						name: p.name,
						debut: p.debut
					}));
				}
			}

			// Redirect if the user cannot access this path
			const pathname =
				url.pathname.endsWith('/') && url.pathname !== '/'
					? url.pathname.slice(0, -1)
					: url.pathname;
			if (!canAccessAdminPath(pathname, permissions)) {
				redirect(302, `/unauthorized?redirect=${encodeURIComponent(url.href)}`);
			}
		}

		menu = filterMenuByPermissions(ADMIN_MENU, permissions);
	}

	(locals as any).permissions = permissions;

	return {
		session,
		user,
		cookies: cookies.getAll(),
		userProfile,
		permissions,
		canCreateOrder,
		menu
	};
};
