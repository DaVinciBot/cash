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

	if (!session) {
		redirect(303, 'https://davincibot.fr');
	}

	let userProfile = null;
	let permissions: string[] = [];
	let canCreateOrder = false;
	let menu = filterMenuByPermissions(ADMIN_MENU, []);

	if (user?.id) {
		const { data, error } = await supabase
			.from('profiles')
			.select('username,avatar_url,permissions, member_of(project(id, name, debut))')
			.eq('id', user.id)
			.single();

		if (!error && data) {
			permissions = (data.permissions as string[]) || [];
			canCreateOrder =
				permissions.includes('make_project_order') || permissions.includes('make_order');

			userProfile = {
				email: user.email || '',
				name: data.username || (user.email ? user.email.split('@')[0] : ''),
				avatar: data.avatar_url || 'https://avatar.iran.liara.run/public/boy',
				id: user.id,
				projects: ((data.member_of as any[]) || []).map((m: any) => ({
					id: m?.project?.id,
					name: m?.project?.name,
					debut: m?.project?.debut || '0000-00-00'
				})),
				permissions,
				allProjects: null as any[] | null
			};

			if (
				hasAnyPermission(permissions, [
					'view_all_orders',
					'view_treso',
					'view_members',
					'edit_treso',
					'edit_members'
				])
			) {
				userProfile.projects.push({ id: 0, name: 'Association', debut: '2014-09-01' });

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
				redirect(302, '/');
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
