export const PERMISSIONS = [
    'manage_training',
    'access_training',
    'view_admin',
    'view_projects_orders',
    'view_all_orders',
    'view_treso',
    'view_members',
    'edit_blog_draft',
    'edit_blog',
    'edit_members',
    'edit_orders',
    'edit_projects_orders',
    'edit_treso'
];

export const ADMIN_MENU = [
    {
        title: 'Mes commandes',
        uri: '/admin',
        icon: 'home-outline',
        requiredPermissions: ['view_admin']
    },
    {
        title: 'SmartShare',
        uri: '/admin/screen-share',
        icon: 'albums-outline',
        requiredPermissions: ['access_training', 'manage_training']
    },
    {
        title: 'Gestion des projets',
        uri: '/admin/projects',
        icon: 'apps-outline',
        requiredPermissions: ['view_projects_orders', 'edit_projects_orders']
    },
    {
        title: 'Commandes',
        uri: '/admin/orders',
        icon: 'card-outline',
        requiredPermissions: ['view_projects_orders', 'view_all_orders', 'edit_orders', 'edit_projects_orders']
    },
    {
        title: 'Gestion des membres',
        uri: '/admin/users',
        icon: 'people-outline',
        requiredPermissions: ['view_members', 'edit_members']
    },
    {
        title: 'Gestion de la trésorerie',
        uri: '/admin/treso',
        icon: 'bar-chart-outline',
        requiredPermissions: ['view_treso', 'edit_treso']
    },
    {
        title: 'Factures',
        uri: '/admin/wip',
        icon: 'attach-outline',
        requiredPermissions: ['view_treso', 'edit_treso']
    },
    {
        title: 'Devis',
        uri: '/admin/wip',
        icon: 'briefcase-outline',
        requiredPermissions: ['view_treso', 'edit_treso']
    },
    {
        title: 'Blog',
        uri: '/admin/blog',
        icon: 'create-outline',
        requiredPermissions: ['edit_blog_draft', 'edit_blog']
    }
];

export const ADMIN_CUSTOM_URI = [
    {
        title: 'Nouvelle commande',
        uri: '/admin/orders/new',
        icon: 'add-outline',
        requiredPermissions: ['view_admin']
    }
];

const ROUTE_RULES = [
    { path: '/admin/orders/new', requiredPermissions: ['view_admin'] },
    { path: '/admin/orders', requiredPermissions: ['view_projects_orders', 'view_all_orders', 'edit_orders', 'edit_projects_orders'] },
    { path: '/admin/projects', requiredPermissions: ['view_projects_orders', 'edit_projects_orders'] },
    { path: '/admin/users', requiredPermissions: ['view_members', 'edit_members'] },
    { path: '/admin/treso', requiredPermissions: ['view_treso', 'edit_treso'] },
    { path: '/admin/wip', requiredPermissions: ['view_treso', 'edit_treso'] },
    { path: '/admin/blog', requiredPermissions: ['edit_blog_draft', 'edit_blog'] },
    { path: '/admin/screen-share', requiredPermissions: ['access_training', 'manage_training'] },
    { path: '/admin', requiredPermissions: ['view_admin'] }
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
    if (!hasAnyPermission(userPermissions, ['view_admin'])) return false;

    const matchedRule = ROUTE_RULES
        .slice()
        .sort((a, b) => b.path.length - a.path.length)
        .find((rule) => path === rule.path || path.startsWith(`${rule.path}/`));

    if (!matchedRule) return true;
    return hasAnyPermission(userPermissions, matchedRule.requiredPermissions);
}

export function filterMenuByPermissions(menu = [], userPermissions = []) {
    return (menu || []).filter((item) => hasAnyPermission(userPermissions, item.requiredPermissions));
}