import type { ProjectRow } from '@davincibot/database-types';
import type { UserProfile, UserProject } from '@davincibot/lib';
import {
	ADMIN_MENU,
	buildLoginUrl,
	canAccessAdminPath,
	filterMenuByPermissions,
	type EffectivePermission,
	type GlobalPermission
} from '@davincibot/lib';
import { redirect } from '@sveltejs/kit';
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
			name: string | null;
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

	if (!session) {
		redirect(303, buildLoginUrl(url.href));
	}

	let userProfile: UserProfile | null = null;
	let permissions: EffectivePermission[] = [];
	let canCreateOrder = false;
	let menu = filterMenuByPermissions(ADMIN_MENU, []);

	if (user?.id) {
		const [
			profileResult,
			{ data: canCreate },
			{ data: canManage },
			{ data: canReadOrders },
			{ data: canReadFinance },
			{ data: canReadProfiles },
			{ data: canWriteFinance },
			{ data: canUpdateProfiles },
			{ data: canReadStats }
		] = await Promise.all([
			supabase
				.from('profiles')
				.select(
					'username,avatar_url,permissions, profile_global_roles!profile_global_roles_profile_fkey(role, revoked_at, global_roles(permissions)), member_of!membre_projet_profile_fkey(role, project(id, name, debut))'
				)
				.eq('id', user.id)
				.single(),
			supabase.rpc('has_permission', { p_permission: 'orders.create.all' }),
			supabase.rpc('has_permission', { p_permission: 'orders.manage.self' }),
			supabase.rpc('has_permission', { p_permission: 'orders.read.all' }),
			supabase.rpc('has_permission', { p_permission: 'finance.read' }),
			supabase.rpc('has_permission', { p_permission: 'members.profile.read.all' }),
			supabase.rpc('has_permission', { p_permission: 'finance.write' }),
			supabase.rpc('has_permission', { p_permission: 'members.profile.update.all' }),
			supabase.rpc('has_permission', { p_permission: 'stats.read.all' })
		]);

		canCreateOrder = canCreate === true || canManage === true;

		const { data, error } = profileResult;
		if (!error) {
			permissions = resolveEffectivePermissions(data);

			const projects: UserProject[] = data.member_of.map((m) => ({
				id: m.project.id,
				name: m.project.name ?? '',
				debut: m.project.debut ?? '0000-00-00',
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
				canReadOrders ||
				canReadFinance ||
				canReadProfiles ||
				canWriteFinance ||
				canUpdateProfiles ||
				canReadStats
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
		// Jamais de token dans les données de page : le navigateur passe par /api/session/token.
		session: { id: session.id, expires_at: session.expires_at, user_id: session.user_id },
		user,
		cookies: cookies.getAll(),
		userProfile,
		permissions,
		canCreateOrder,
		menu
	};
};
