import { describe, expect, it } from 'vitest';

import { canAccessAdminPath, hasAnyPermission, normalizePath } from '../../src/lib/permissions.js';

describe('permissions helpers', () => {
	it('hasAnyPermission returns true when a match exists', () => {
		expect(hasAnyPermission(['view_admin', 'edit_orders'], ['edit_orders'])).toBe(true);
	});

	it('normalizePath removes trailing slash for non-root routes', () => {
		expect(normalizePath('/admin/orders/')).toBe('/admin/orders');
		expect(normalizePath('/')).toBe('/');
	});

	it('canAccessAdminPath blocks protected route without permission', () => {
		expect(canAccessAdminPath('/admin/orders', ['view_admin'])).toBe(false);
	});
});
