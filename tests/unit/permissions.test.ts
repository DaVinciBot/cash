import { describe, expect, it } from 'vitest';

import {
	ADMIN_MENU,
	canAccessAdminPath,
	filterMenuByPermissions,
	hasAnyPermission,
	normalizePath
} from '@davincibot/lib';

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
		expect(normalizePath('/admin/items/')).toBe('/admin/items');
		expect(normalizePath('/')).toBe('/');
		expect(normalizePath('')).toBe('/');
	});

	it('canAccessAdminPath blocks protected route without permission', () => {
		expect(canAccessAdminPath('/admin/items', ['training.slot.read'])).toBe(false);
	});

	it('canAccessAdminPath allows non-admin route', () => {
		expect(canAccessAdminPath('/blog/article', [])).toBe(true);
	});

	it('canAccessAdminPath requires at least one admin permission for admin routes', () => {
		expect(canAccessAdminPath('/admin', [])).toBe(false);
		expect(canAccessAdminPath('/admin', ['orders.items.manage.self'])).toBe(true);
	});

	// Le parcours membre s'ouvre sur orders.items.manage.self, la permission que
	// porte le rôle `member` : voir toutes les commandes ne donne pas le droit
	// d'en demander pour soi.
	it('canAccessAdminPath applies the most specific route rule', () => {
		expect(canAccessAdminPath('/admin/items/new', ['orders.read.all'])).toBe(false);
		expect(canAccessAdminPath('/admin/items/new', ['orders.items.manage.self'])).toBe(true);
	});

	it('canAccessAdminPath handles nested paths using route prefix matching', () => {
		expect(canAccessAdminPath('/admin/items/123/edit', ['orders.items.manage.self'])).toBe(true);
		expect(canAccessAdminPath('/admin/items/123/edit', ['training.slot.read'])).toBe(false);
	});

	it('canAccessAdminPath requires smartshare cast permission for SmartShare', () => {
		expect(canAccessAdminPath('/admin/screen-share', ['training.slot.manage'])).toBe(false);
		expect(canAccessAdminPath('/admin/screen-share', ['integration.smartshare.cast'])).toBe(true);
	});

	it('filterMenuByPermissions keeps only authorized entries', () => {
		const menu = filterMenuByPermissions(ADMIN_MENU, [
			'orders.items.manage.self',
			'training.slot.manage'
		]);
		const uris = menu.map((item) => item.uri);

		expect(uris).toContain('/admin');
		expect(uris).toContain('/admin/trainings');
		expect(uris).not.toContain('/admin/users');
	});

	// L'écran de trésorerie de l'ancien modèle a disparu du menu : il lisait des
	// tables supprimées par la refonte du schéma, et sa remplaçante n'arrive
	// qu'au jalon 6. `/admin/orders` est réapparu depuis, mais c'est une AUTRE
	// page — la liste des commandes du parcours trésorier —, gardée par les
	// permissions du nouveau modèle.
	it('ADMIN_MENU no longer exposes the legacy treasury screen', () => {
		const uris = ADMIN_MENU.map((item) => item.uri);

		expect(uris).not.toContain('/admin/treso');
	});

	it('ADMIN_MENU expose la liste des commandes aux seuls lecteurs de commandes', () => {
		const pourMembre = filterMenuByPermissions(ADMIN_MENU, ['orders.items.manage.self']).map(
			(item) => item.uri
		);
		const pourTresorier = filterMenuByPermissions(ADMIN_MENU, [
			'orders.read.all',
			'orders.bundle.manage'
		]).map((item) => item.uri);

		expect(pourMembre).not.toContain('/admin/orders');
		expect(pourMembre).not.toContain('/admin/bundle');
		expect(pourTresorier).toContain('/admin/orders');
		expect(pourTresorier).toContain('/admin/bundle');
	});
});
