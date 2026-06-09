import { describe, expect, it } from 'vitest';

import {
	ADMIN_MENU,
	canAccessAdminPath,
	filterMenuByPermissions,
	hasAnyPermission,
	normalizePath
} from '../../src/lib/permissions';

describe('permissions helpers', () => {
	it('hasAnyPermission returns true when a match exists', () => {
		expect(
			hasAnyPermission(['orders.read.all', 'orders.lifecycle.update.all'], ['orders.read.all'])
		).toBe(true);
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
		expect(canAccessAdminPath('/admin/orders', ['training.slot.read'])).toBe(false);
	});

	it('canAccessAdminPath allows non-admin route', () => {
		expect(canAccessAdminPath('/blog/article', [])).toBe(true);
	});

	it('canAccessAdminPath requires at least one admin permission for admin routes', () => {
		expect(canAccessAdminPath('/admin', [])).toBe(false);
		expect(canAccessAdminPath('/admin', ['orders.cru.self'])).toBe(true);
	});

	it('canAccessAdminPath applies the most specific route rule', () => {
		expect(canAccessAdminPath('/admin/orders/new', ['orders.read.all'])).toBe(false);
		expect(canAccessAdminPath('/admin/orders/new', ['orders.cru.self'])).toBe(true);
	});

	it('canAccessAdminPath handles nested paths using route prefix matching', () => {
		expect(canAccessAdminPath('/admin/orders/123', ['orders.read.all'])).toBe(true);
		expect(canAccessAdminPath('/admin/orders/123', ['training.slot.read'])).toBe(false);
	});

	it('canAccessAdminPath requires smartshare cast permission for SmartShare', () => {
		expect(canAccessAdminPath('/admin/screen-share', ['training.slot.cu'])).toBe(false);
		expect(canAccessAdminPath('/admin/screen-share', ['integration.smartshare.cast'])).toBe(true);
	});

	it('filterMenuByPermissions keeps only authorized entries', () => {
		const menu = filterMenuByPermissions(ADMIN_MENU, ['orders.cru.self', 'training.slot.cu']);
		const uris = menu.map((item) => item.uri);

		expect(uris).toContain('/admin');
		expect(uris).toContain('/admin/trainings');
		expect(uris).not.toContain('/admin/users');
	});
});
