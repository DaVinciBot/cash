import { describe, expect, it } from 'vitest';

import {
	ADMIN_MENU,
	canAccessAdminPath,
	filterMenuByPermissions,
	hasAnyPermission,
	normalizePath
} from '../../src/lib/permissions.js';

describe('permissions helpers', () => {
	it('hasAnyPermission returns true when a match exists', () => {
		expect(hasAnyPermission(['view_admin', 'edit_orders'], ['edit_orders'])).toBe(true);
	});

	it('hasAnyPermission returns true when no permission is required', () => {
		expect(hasAnyPermission([], [])).toBe(true);
		expect(hasAnyPermission([], undefined)).toBe(true);
	});

	it('normalizePath removes trailing slash for non-root routes', () => {
		expect(normalizePath('/admin/orders/')).toBe('/admin/orders');
		expect(normalizePath('/')).toBe('/');
		expect(normalizePath('')).toBe('/');
	});

	it('canAccessAdminPath blocks protected route without permission', () => {
		expect(canAccessAdminPath('/admin/orders', ['view_admin'])).toBe(false);
	});

	it('canAccessAdminPath allows non-admin route', () => {
		expect(canAccessAdminPath('/blog/article', [])).toBe(true);
	});

	it('canAccessAdminPath requires view_admin for any admin route', () => {
		expect(canAccessAdminPath('/admin', ['edit_orders'])).toBe(false);
		expect(canAccessAdminPath('/admin', ['view_admin'])).toBe(true);
	});

	it('canAccessAdminPath applies the most specific route rule', () => {
		expect(canAccessAdminPath('/admin/orders/new', ['view_admin', 'edit_orders'])).toBe(false);
		expect(canAccessAdminPath('/admin/orders/new', ['view_admin', 'make_project_order'])).toBe(true);
	});

	it('canAccessAdminPath handles nested paths using route prefix matching', () => {
		expect(canAccessAdminPath('/admin/orders/123', ['view_admin', 'edit_orders'])).toBe(true);
		expect(canAccessAdminPath('/admin/orders/123', ['view_admin'])).toBe(false);
	});

	it('filterMenuByPermissions keeps only authorized entries', () => {
		const menu = filterMenuByPermissions(ADMIN_MENU, ['view_admin', 'edit_trainings']);
		const uris = menu.map((item) => item.uri);

		expect(uris).toContain('/admin');
		expect(uris).toContain('/admin/training');
		expect(uris).not.toContain('/admin/users');
	});
});
