import {
	ADMIN_MENU,
	canAccessAdminPath,
	filterMenuByPermissions,
	hasAnyPermission,
	type EffectivePermission,
	type GlobalPermission
} from '$lib/permissions';
import type { UserProfile, UserProject } from '$lib/types/profile';
import { redirect } from '@sveltejs/kit';
import type { ProjectRow } from '../database.types';
import type { LayoutServerLoad } from './$types';

interface ProfileRow {
	username: string | null;
	avatar_url: string | null;
	permissions: GlobalPermission[] | null;
	profile_global_roles: {
		role: string;
		revoked_at: string | null;
		global_roles: { permissions: GlobalPermission[] | null } | null;
	}[];
	member_of: {
		role: string;
		project: {
			id: number;
			name: string;
			debut: string | null;
		} | null;
	}[];
}

function resolveEffectivePermissions(data: ProfileRow): EffectivePermission[] {
	const set = new Set<EffectivePermission>();
	for (const p of data.permissions ?? []) {
		set.add(p);
	}
	for (const assignment of data.profile_global_roles) {
		if (assignment.revoked_at) {
			continue;
		}
		for (const p of assignment.global_roles?.permissions ?? []) {
			set.add(p);
		}
	}
	return [...set];
}

export const load: LayoutServerLoad = async ({ locals, cookies, url }) => {
	const { safeGetSession, supabase } = locals;
	const { session, user } = await safeGetSession();

	if (!session && !import.meta.env.DEV) {
		redirect(303, 'https://davincibot.fr');
	}

	let userProfile: UserProfile | null = null;
	let permissions: EffectivePermission[] = [];
	let canCreateOrder = false;
	let menu = filterMenuByPermissions(ADMIN_MENU, []);

	if (user?.id) {
		const { data, error } = (await supabase
			.from('profiles')
			.select(
				'username,avatar_url,permissions, profile_global_roles(role, revoked_at, global_roles(permissions)), member_of(role, project(id, name, debut))'
			)
			.eq('id', user.id)
			.single()) as { data: ProfileRow | null; error: unknown };

		if (!error && data) {
			permissions = resolveEffectivePermissions(data);
			canCreateOrder =
				permissions.includes('orders.create.all') || permissions.includes('orders.manage.self');

			const projects: UserProject[] = data.member_of.map((m) => ({
				id: m.project?.id ?? 0,
				name: m.project?.name ?? '',
				debut: m.project?.debut ?? '0000-00-00',
				role: m.role
			}));

			userProfile = {
				email: user.email ?? '',
				name: data.username ?? (user.email ? (user.email.split('@').at(0) ?? '') : ''),
				avatar: data.avatar_url ?? 'https://avatar.iran.liara.run/public/boy',
				id: user.id,
				projects,
				permissions,
				allProjects: null
			};

			if (
				hasAnyPermission(permissions, [
					'orders.read.all',
					'finance.read',
					'members.profile.read.all',
					'finance.write',
					'members.profile.update.all',
					'stats.read.all'
				])
			) {
				userProfile.projects.push({
					id: 0,
					name: 'Association',
					debut: '2014-09-01',
					role: 'association'
				}); //TODO: review

				const { data: projects, error: projectsError } = (await supabase
					.from('projects')
					.select('id, name, debut')) as { data: ProjectRow[] | null; error: unknown };
				if (!projectsError) {
					userProfile.allProjects = (projects ?? []).map((p) => ({
						value: p.id,
						name: p.name ?? '',
						debut: p.debut ?? ''
					}));
				}
			}

			// Redirect if the user cannot access this path
			const pathname =
				url.pathname.endsWith('/') && url.pathname !== '/'
					? url.pathname.slice(0, -1)
					: url.pathname;
			if (!canAccessAdminPath(pathname, permissions)) {
				redirect(302, '/unauthorized');
			}
		}

		menu = filterMenuByPermissions(ADMIN_MENU, permissions);
	}

	locals.permissions = permissions;

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
