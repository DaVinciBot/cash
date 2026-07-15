export const GLOBAL_PERMISSIONS = [
	// members.*
	'members.profile.read.all',
	'members.profile.update.all',
	'members.invite.send',
	'members.profile.status.update',
	'members.projects.update.all',
	// iam.*
	'iam.roles.manage',
	'iam.overrides.manage',
	// training.*
	'training.catalog.read',
	'training.slot.read',
	'training.slot.manage',
	'training.registration.manage.self',
	'training.registration.read.all',
	'training.registration.manage.all',
	'training.presence.update',
	'training.summary_email.receive',
	'training.summary.discord.send',
	'training.story.discord.send',
	// orders.*
	'orders.manage.self',
	'orders.read.all',
	'orders.create.all',
	'orders.lifecycle.update.all',
	// stats.* / finance.*
	'stats.read.all',
	'finance.read',
	'finance.write',
	// blog.*
	'blog.draft.write',
	'blog.publish',
	// integration.*
	'integration.smartshare.cast',
	// audit.*
	'audit.logs.read',
	'audit.logs.read.security',
	'audit.events.export',
	// infra.*
	'infra.environments.access'
] as const;

export type GlobalPermission = (typeof GLOBAL_PERMISSIONS)[number];

/** Permissions scopées-projet — enum public.project_permission (distinct). */
export const PROJECT_PERMISSIONS = [
	'orders.read.project',
	'orders.lifecycle.update.project',
	'members.projects.read.project'
] as const;

export type ProjectPermission = (typeof PROJECT_PERMISSIONS)[number];

/** Rôles globaux — enum public.global_role (rang décroissant). */
export const GLOBAL_ROLES = [
	'super_admin',
	'president',
	'directorate',
	'secretary',
	'treasurer',
	'project_director',
	'training_director',
	'digital_department',
	'communication_director',
	'content_writer',
	'member',
	'guest'
] as const;

export type GlobalRole = (typeof GLOBAL_ROLES)[number];

/** Rôles projet — enum public.project_role. */
export const PROJECT_ROLES = ['cdp', 'project_member'] as const;

export type ProjectRole = (typeof PROJECT_ROLES)[number];

/** Libellés FR (affichage uniquement, jamais une source d'autorisation). */
export const GLOBAL_ROLE_LABELS_FR: Record<GlobalRole, string> = {
	super_admin: 'Super administrateur',
	president: 'Président·e',
	directorate: 'Bureau',
	secretary: 'Secrétaire',
	treasurer: 'Trésorièr·e',
	project_director: 'Responsable projets',
	training_director: 'Responsable formation',
	digital_department: 'Pôle numérique',
	communication_director: 'Responsable communication',
	content_writer: 'Rédacteur·ice',
	member: 'Membre',
	guest: 'Invité·e'
};

export const PROJECT_ROLE_LABELS_FR: Record<ProjectRole, string> = {
	cdp: 'Chef de projet (CDP)',
	project_member: 'Membre du projet'
};

export type EffectivePermission = GlobalPermission | ProjectPermission;

const ADMIN_ENTRY_PERMISSIONS: GlobalPermission[] = [
	'orders.manage.self',
	'orders.read.all',
	'orders.create.all',
	'orders.lifecycle.update.all',
	'members.profile.read.all',
	'members.profile.update.all',
	'members.projects.update.all',
	'training.catalog.read',
	'training.slot.read',
	'training.slot.manage',
	'finance.read',
	'finance.write',
	'blog.draft.write',
	'blog.publish',
	'integration.smartshare.cast',
	'stats.read.all',
	'training.summary.discord.send',
	'audit.logs.read',
	'audit.logs.read.security',
	'audit.events.export'
];

export const ADMIN_MENU: {
	title: string;
	uri: string;
	icon: string;
	requiredPermissions: GlobalPermission[];
}[] = [
	{
		title: 'Mes commandes',
		uri: '/admin',
		icon: 'home-outline',
		requiredPermissions: ['orders.manage.self', 'orders.read.all']
	},
	{
		title: 'SmartShare',
		uri: '/admin/screen-share',
		icon: 'albums-outline',
		requiredPermissions: ['integration.smartshare.cast']
	},
	{
		title: 'Formations',
		uri: '/admin/trainings',
		icon: 'school-outline',
		requiredPermissions: ['training.catalog.read', 'training.slot.read', 'training.slot.manage']
	},
	{
		title: 'Gestion des projets',
		uri: '/admin/projects',
		icon: 'apps-outline',
		requiredPermissions: ['members.projects.update.all', 'stats.read.all']
	},
	{
		title: 'Commandes',
		uri: '/admin/orders',
		icon: 'card-outline',
		requiredPermissions: ['orders.read.all', 'orders.lifecycle.update.all', 'orders.manage.self']
	},
	{
		title: 'Gestion des membres',
		uri: '/admin/users',
		icon: 'people-outline',
		requiredPermissions: ['members.profile.read.all', 'members.profile.update.all']
	},
	{
		title: 'Gestion de la trésorerie',
		uri: '/admin/treso',
		icon: 'bar-chart-outline',
		requiredPermissions: ['finance.read', 'finance.write']
	},
	{
		title: 'Factures',
		uri: '/admin/wip',
		icon: 'attach-outline',
		requiredPermissions: ['finance.read', 'finance.write']
	},
	{
		title: 'Devis',
		uri: '/admin/wip',
		icon: 'briefcase-outline',
		requiredPermissions: ['finance.read', 'finance.write']
	},
	{
		title: 'Blog',
		uri: '/admin/blog',
		icon: 'create-outline',
		requiredPermissions: ['blog.draft.write', 'blog.publish']
	}
];

export const ADMIN_CUSTOM_URI: {
	title: string;
	uri: string;
	icon: string;
	requiredPermissions: GlobalPermission[];
}[] = [
	{
		title: 'Nouvelle commande',
		uri: '/admin/orders/new',
		icon: 'add-outline',
		requiredPermissions: ['orders.create.all', 'orders.manage.self']
	}
];

const ROUTE_RULES: { path: string; requiredPermissions: GlobalPermission[] }[] = [
	{ path: '/admin/orders/new', requiredPermissions: ['orders.create.all', 'orders.manage.self'] },
	{
		path: '/admin/orders',
		requiredPermissions: ['orders.read.all', 'orders.lifecycle.update.all', 'orders.manage.self']
	},
	{
		path: '/admin/projects',
		requiredPermissions: ['members.projects.update.all', 'stats.read.all']
	},
	{
		path: '/admin/users',
		requiredPermissions: ['members.profile.read.all', 'members.profile.update.all']
	},
	{ path: '/admin/treso', requiredPermissions: ['finance.read', 'finance.write'] },
	{ path: '/admin/wip', requiredPermissions: ['finance.read', 'finance.write'] },
	{ path: '/admin/blog', requiredPermissions: ['blog.draft.write', 'blog.publish'] },
	{
		path: '/admin/screen-share',
		requiredPermissions: ['integration.smartshare.cast']
	},
	{
		path: '/admin/trainings',
		requiredPermissions: ['training.catalog.read', 'training.slot.read', 'training.slot.manage']
	},
	{ path: '/admin', requiredPermissions: ADMIN_ENTRY_PERMISSIONS }
];

export interface PermissionUser {
	permissions?: readonly EffectivePermission[];
}

export function hasPermission(
	user: PermissionUser | null | undefined,
	permission: EffectivePermission
): boolean {
	if (!user || !Array.isArray(user.permissions)) {
		return false;
	}
	return user.permissions.includes(permission);
}

export function hasAnyPermission(
	userPermissions: readonly EffectivePermission[] = [],
	requiredPermissions: readonly EffectivePermission[] = []
): boolean {
	if (!Array.isArray(requiredPermissions) || requiredPermissions.length === 0) {
		return true;
	}
	if (!Array.isArray(userPermissions) || userPermissions.length === 0) {
		return false;
	}
	const permissionsSet = new Set(userPermissions);
	return requiredPermissions.some((permission) => permissionsSet.has(permission));
}

export function normalizePath(path = '') {
	if (!path) {
		return '/';
	}
	if (path !== '/' && path.endsWith('/')) {
		return path.slice(0, -1);
	}
	return path;
}

export function canAccessAdminPath(pathname = '', userPermissions: EffectivePermission[] = []) {
	const path = normalizePath(pathname);
	if (!(path === '/admin' || path.startsWith('/admin/'))) {
		return true;
	}
	if (!hasAnyPermission(userPermissions, ADMIN_ENTRY_PERMISSIONS)) {
		return false;
	}

	const matchedRule = ROUTE_RULES.slice()
		.sort((a, b) => b.path.length - a.path.length)
		.find((rule) => path === rule.path || path.startsWith(`${rule.path}/`));

	if (!matchedRule) {
		return true;
	}
	return hasAnyPermission(userPermissions, matchedRule.requiredPermissions);
}

export function filterMenuByPermissions(
	menu: {
		title: string;
		uri: string;
		icon: string;
		requiredPermissions: GlobalPermission[];
	}[] = [],
	userPermissions: EffectivePermission[] = []
) {
	return menu.filter((item) => hasAnyPermission(userPermissions, item.requiredPermissions));
}
