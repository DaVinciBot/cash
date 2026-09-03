import { GLOBAL_PERMISSIONS, GLOBAL_ROLES } from '@davincibot/lib';
import { describe, expect, it } from 'vitest';

import {
	buildPermissionCategories,
	GLOBAL_PERMISSION_LABELS,
	GLOBAL_ROLE_CATEGORIES,
	OVERRIDE_PERMISSION_CATEGORIES
} from '$lib/rbacCatalog';

// Le tiroir « Membres » attribue les permissions en exception à partir de ce
// catalogue. Une permission absente du catalogue est une permission qu'aucun
// administrateur ne peut plus accorder ni retirer depuis l'interface : le
// référentiel a déjà dérivé une fois de l'enum Postgres, d'où ces garde-fous.
describe('catalogue RBAC du panneau admin', () => {
	it('couvre exactement les permissions globales du référentiel', () => {
		const catalogued = Object.values(OVERRIDE_PERMISSION_CATEGORIES)
			.flat()
			.map((entry) => entry.value);

		expect([...catalogued].sort()).toEqual([...GLOBAL_PERMISSIONS].sort());
	});

	it('ne classe jamais deux fois la même permission', () => {
		const catalogued = Object.values(OVERRIDE_PERMISSION_CATEGORIES)
			.flat()
			.map((entry) => entry.value);

		expect(new Set(catalogued).size).toBe(catalogued.length);
	});

	it('ne laisse aucune section vide ni aucun libellé manquant', () => {
		for (const [title, entries] of Object.entries(OVERRIDE_PERMISSION_CATEGORIES)) {
			expect(entries.length, `section « ${title} » vide`).toBeGreaterThan(0);
			for (const entry of entries) {
				expect(entry.label, `libellé manquant pour ${entry.value}`).toBeTruthy();
				expect(entry.label).not.toBe(entry.value);
			}
		}
	});

	it('range les permissions non classées dans « Autres » plutôt que de les perdre', () => {
		// `buildPermissionCategories` est rejoué ici pour vérifier le filet de
		// sécurité : le catalogue actuel ne l'utilise pas, il doit rester actif.
		const categories = buildPermissionCategories();
		const catalogued = Object.values(categories).flat().length;

		expect(catalogued).toBe(GLOBAL_PERMISSIONS.length);
		expect(Object.keys(categories)).not.toContain('Autres');
	});

	it('couvre exactement les rôles globaux du référentiel', () => {
		const catalogued = Object.values(GLOBAL_ROLE_CATEGORIES)
			.flat()
			.map((entry) => entry.value);

		expect([...catalogued].sort()).toEqual([...GLOBAL_ROLES].sort());
		expect(new Set(catalogued).size).toBe(catalogued.length);
	});

	it('libelle chaque permission en français', () => {
		for (const permission of GLOBAL_PERMISSIONS) {
			expect(GLOBAL_PERMISSION_LABELS[permission]).toBeTruthy();
		}
	});
});
