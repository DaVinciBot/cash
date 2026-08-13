import { describe, expect, it } from 'vitest';

import {
	ADMIN_MENU,
	canAccessAdminPath,
	filterMenuByPermissions,
	isItemReviewableByCdp,
	ITEM_STATES,
	REFUSAL_REASON_MIN_LENGTH,
	refusalReasonError,
	type EffectivePermission
} from '@davincibot/lib';

describe('périmètre de la revue CDP (§8)', () => {
	// Une fois validé, l'item appartient au trésorier : check_item_transition
	// refuse tout retour en arrière, et l'écran ne doit pas proposer un bouton
	// que la base rejettera.
	it('ne laisse statuer que sur un item en revue', () => {
		expect(isItemReviewableByCdp('pending_cdp')).toBe(true);
		for (const state of ITEM_STATES.filter((s) => s !== 'pending_cdp')) {
			expect(isItemReviewableByCdp(state)).toBe(false);
		}
	});
});

describe('motif de refus obligatoire (CMD-F-29, réutilisé en J5)', () => {
	it("refuse un motif vide ou fait d'espaces", () => {
		expect(refusalReasonError('')).toBeTruthy();
		expect(refusalReasonError('   ')).toBeTruthy();
	});

	// Le motif est la seule explication que le membre recevra : un « non » le
	// renvoie poser la question de vive voix, ce que ce jalon est censé éviter.
	it('refuse un motif trop court pour expliquer quoi que ce soit', () => {
		expect(refusalReasonError('non')).toBeTruthy();
		expect(refusalReasonError('x'.repeat(REFUSAL_REASON_MIN_LENGTH - 1))).toBeTruthy();
	});

	it('accepte un motif exploitable, espaces de bord compris', () => {
		expect(refusalReasonError('  hors budget ce trimestre  ')).toBeNull();
		expect(refusalReasonError('x'.repeat(REFUSAL_REASON_MIN_LENGTH))).toBeNull();
	});
});

describe('ouverture de la file aux permissions scopées-projet', () => {
	const cdp: EffectivePermission[] = ['orders.items.manage.self', 'orders.items.review.project'];
	const membre: EffectivePermission[] = ['orders.items.manage.self'];

	// La revue est une permission projet : gérée comme une permission globale,
	// son entrée de menu serait inatteignable pour tout le monde.
	it("affiche l'entrée de menu à un CDP et la cache aux autres", () => {
		const pourCdp = filterMenuByPermissions(ADMIN_MENU, cdp).map((entry) => entry.uri);
		const pourMembre = filterMenuByPermissions(ADMIN_MENU, membre).map((entry) => entry.uri);
		expect(pourCdp).toContain('/admin/review');
		expect(pourMembre).not.toContain('/admin/review');
	});

	it('garde la route pour un membre sans mandat de revue', () => {
		expect(canAccessAdminPath('/admin/review', cdp)).toBe(true);
		expect(canAccessAdminPath('/admin/review/', cdp)).toBe(true);
		expect(canAccessAdminPath('/admin/review', membre)).toBe(false);
	});

	// Un CDP qui ne détiendrait aucune permission globale doit tout de même
	// franchir la garde d'entrée de /admin, sinon il est renvoyé avant d'arriver
	// à sa file.
	it('laisse entrer dans /admin un CDP sans aucune permission globale', () => {
		expect(canAccessAdminPath('/admin/review', ['orders.items.review.project'])).toBe(true);
	});
});
