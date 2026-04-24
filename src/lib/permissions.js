export const PERMISSIONS = [
	'members.profile.read.all',
	'members.profile.create',
	'members.profile.update.all',
	'members.projects.read.all',
	'members.projects.update.all',
	'members.invite.send',
	'members.profile.status.update',
	'iam.permissions.catalog.read',
	'iam.permissions.read.all',
	'iam.permissions.assign.all',
	'iam.permissions.assign.owned',
	'iam.permissions.revoke.all',
	'iam.permissions.revoke.owned',
	'training.catalog.read',
	'training.slot.read',
	'training.slot.cu',
	'training.registration.cru.self',
	'training.registration.read.all',
	'training.registration.cu.all',
	'training.presence.update',
	'training.summary_email.receive',
	'orders.cru.self',
	'orders.read.all',
	'orders.create.all',
	'orders.lifecycle.update.all',
	'projects.stats.read.all',
	'finance.read',
	'finance.write',
	'blog.draft.write',
	'blog.publish',
	'integration.smartshare.cast',
	'integration.discord.summary_webhook.send',
	'audit.logs.read',
	'audit.logs.read.security',
	'audit.events.export'
];

const ADMIN_ENTRY_PERMISSIONS = [
	'orders.cru.self',
	'orders.read.all',
	'orders.create.all',
	'orders.lifecycle.update.all',
	'members.profile.read.all',
	'members.profile.update.all',
	'members.projects.read.all',
	'members.projects.update.all',
	'training.catalog.read',
	'training.slot.read',
	'training.slot.cu',
	'finance.read',
	'finance.write',
	'blog.draft.write',
	'blog.publish',
	'integration.smartshare.cast',
	'projects.stats.read.all',
	'integration.discord.summary_webhook.send',
	'audit.logs.read',
	'audit.logs.read.security',
	'audit.events.export'
];

export const ADMIN_MENU = [
	{
		title: 'Mes commandes',
		uri: '/admin',
		icon: 'home-outline',
		requiredPermissions: ['orders.cru.self', 'orders.read.all']
	},
	{
		title: 'SmartShare',
		uri: '/admin/screen-share',
		icon: 'albums-outline',
		requiredPermissions: ['integration.smartshare.cast']
	},
	{
		title: 'Formations',
		uri: '/admin/training',
		icon: 'school-outline',
		requiredPermissions: ['training.catalog.read', 'training.slot.read', 'training.slot.cu']
	},
	{
		title: 'Gestion des projets',
		uri: '/admin/projects',
		icon: 'apps-outline',
		requiredPermissions: [
			'members.projects.read.all',
			'members.projects.update.all',
			'projects.stats.read.all'
		]
	},
	{
		title: 'Commandes',
		uri: '/admin/orders',
		icon: 'card-outline',
		requiredPermissions: ['orders.read.all', 'orders.lifecycle.update.all', 'orders.cru.self']
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

export const ADMIN_CUSTOM_URI = [
	{
		title: 'Nouvelle commande',
		uri: '/admin/orders/new',
		icon: 'add-outline',
		requiredPermissions: ['orders.create.all', 'orders.cru.self']
	}
];

const ROUTE_RULES = [
	{ path: '/admin/orders/new', requiredPermissions: ['orders.create.all', 'orders.cru.self'] },
	{
		path: '/admin/orders',
		requiredPermissions: ['orders.read.all', 'orders.lifecycle.update.all', 'orders.cru.self']
	},
	{
		path: '/admin/projects',
		requiredPermissions: [
			'members.projects.read.all',
			'members.projects.update.all',
			'projects.stats.read.all'
		]
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
		path: '/admin/training',
		requiredPermissions: ['training.catalog.read', 'training.slot.read', 'training.slot.cu']
	},
	{ path: '/admin', requiredPermissions: ADMIN_ENTRY_PERMISSIONS }
];

export function hasAnyPermission(userPermissions = [], requiredPermissions = []) {
	if (!Array.isArray(requiredPermissions) || requiredPermissions.length === 0) return true;
	if (!Array.isArray(userPermissions) || userPermissions.length === 0) return false;
	const permissionsSet = new Set(userPermissions);
	return requiredPermissions.some((permission) => permissionsSet.has(permission));
}

export function normalizePath(path = '') {
	if (!path) return '/';
	if (path !== '/' && path.endsWith('/')) return path.slice(0, -1);
	return path;
}

export function canAccessAdminPath(pathname = '', userPermissions = []) {
	const path = normalizePath(pathname);
	if (!(path === '/admin' || path.startsWith('/admin/'))) return true;
	if (!hasAnyPermission(userPermissions, ADMIN_ENTRY_PERMISSIONS)) return false;

	const matchedRule = ROUTE_RULES.slice()
		.sort((a, b) => b.path.length - a.path.length)
		.find((rule) => path === rule.path || path.startsWith(`${rule.path}/`));

	if (!matchedRule) return true;
	return hasAnyPermission(userPermissions, matchedRule.requiredPermissions);
}

export function filterMenuByPermissions(menu = [], userPermissions = []) {
	return (menu || []).filter((item) => hasAnyPermission(userPermissions, item.requiredPermissions));
}
