import { describe, expect, it } from 'vitest';

import { defaultLeafFor } from '$lib/server/orders';
import {
	isItemBundlable,
	isItemRefusableByTreasurer,
	isOrderCancelable,
	isOrderEditable,
	isOrderPassable,
	ITEM_STATES,
	ORDER_STATES,
	SHIPPING_ALLOCATION_LABELS,
	SHIPPING_ALLOCATIONS
} from '@davincibot/lib';

// Arbre de démonstration, calqué sur celui de la base de développement :
// deux racines, des nœuds intermédiaires, et une feuille par défaut par branche.
const nodes = [
	{ id: 1, parentId: null, isDefault: false, archivedAt: null }, // Pôle Event
	{ id: 2, parentId: 1, isDefault: false, archivedAt: null }, // WEI
	{ id: 4, parentId: 1, isDefault: true, archivedAt: null }, // Divers Event
	{ id: 5, parentId: null, isDefault: false, archivedAt: null }, // Pôle Projet
	{ id: 10, parentId: 5, isDefault: false, archivedAt: null }, // CDR Nantes
	{ id: 11, parentId: 10, isDefault: true, archivedAt: null }, // CDR_Nantes_Mouser
	{ id: 12, parentId: 10, isDefault: false, archivedAt: null }, // CDR_Nantes_Divers
	{ id: 13, parentId: 5, isDefault: false, archivedAt: null }, // Exodus, feuille sans défaut
	{ id: 20, parentId: 5, isDefault: true, archivedAt: '2026-01-01' } // feuille archivée
];
const leafIds = new Set([2, 4, 11, 12, 13]);

describe('présélection de la feuille d’imputation (CMD-F-18, TRESO-F-02c)', () => {
	// Le projet pointe presque toujours un nœud intermédiaire, qui ne reçoit
	// aucune imputation : c'est la descente jusqu'à la feuille par défaut qui
	// rend la présélection possible.
	it('descend du nœud désigné jusqu’à la feuille par défaut', () => {
		expect(defaultLeafFor(nodes, leafIds, 10)).toBe(11);
		expect(defaultLeafFor(nodes, leafIds, 1)).toBe(4);
	});

	it('traverse plusieurs niveaux', () => {
		expect(defaultLeafFor(nodes, leafIds, 5)).toBe(11);
	});

	it('retient le nœud lui-même quand c’est déjà une feuille', () => {
		expect(defaultLeafFor(nodes, leafIds, 13)).toBe(13);
	});

	// Deviner sur quel poste l'argent part serait pire que ne rien présélectionner :
	// `check_order_imputation` bloquera le passage tant que le trésorier n'a pas
	// tranché lui-même.
	it('ne présélectionne rien sans feuille par défaut ni projet rattaché', () => {
		const sansDefaut = nodes.map((n) => ({ ...n, isDefault: false }));
		expect(defaultLeafFor(sansDefaut, leafIds, 10)).toBeNull();
		expect(defaultLeafFor(nodes, leafIds, null)).toBeNull();
	});

	it('ignore les feuilles archivées', () => {
		expect(defaultLeafFor(nodes, new Set([2, 4, 11, 12, 13, 20]), 5)).toBe(11);
	});
});

describe('cycle de vie côté trésorier (§8)', () => {
	it('ne regroupe que les items validés et libres', () => {
		expect(isItemBundlable('pending_bundled')).toBe(true);
		for (const state of ITEM_STATES.filter((s) => s !== 'pending_bundled')) {
			expect(isItemBundlable(state)).toBe(false);
		}
	});

	// CMD-F-2A : un item regroupé ne se refuse pas directement, il faut d'abord
	// annuler la commande qui le porte ; un item reçu ne se refuse jamais.
	it('n’ouvre le veto trésorier que sur un item validé', () => {
		expect(isItemRefusableByTreasurer('pending_bundled')).toBe(true);
		expect(isItemRefusableByTreasurer('bundled')).toBe(false);
		expect(isItemRefusableByTreasurer('received')).toBe(false);
	});

	it('ne laisse passer qu’une commande en attente du trésorier', () => {
		expect(isOrderPassable('pending_treso')).toBe(true);
		for (const state of ORDER_STATES.filter((s) => s !== 'pending_treso')) {
			expect(isOrderPassable(state)).toBe(false);
		}
	});

	// CMD-F-32 : la correction a posteriori vise d'abord la commande terminée —
	// c'est au relevé bancaire qu'on découvre le montant réellement débité.
	// L'annulation, elle, se ferme dès la livraison complète.
	it('garde une commande modifiable jusqu’à l’annulation', () => {
		expect(isOrderEditable('pending_treso')).toBe(true);
		expect(isOrderEditable('pending_delivery')).toBe(true);
		expect(isOrderEditable('completed')).toBe(true);
		expect(isOrderEditable('canceled')).toBe(false);
	});

	it('n’annule que ce qui n’est pas encore entièrement livré', () => {
		expect(isOrderCancelable('pending_treso')).toBe(true);
		expect(isOrderCancelable('pending_delivery')).toBe(true);
		expect(isOrderCancelable('completed')).toBe(false);
		expect(isOrderCancelable('canceled')).toBe(false);
	});
});

describe('référentiel de répartition des frais de port (§7.2)', () => {
	it('couvre exactement l’enum cash.shipping_allocation, proportionnel en tête', () => {
		expect(SHIPPING_ALLOCATIONS).toEqual(['proportional', 'equal']);
		for (const mode of SHIPPING_ALLOCATIONS) {
			expect(SHIPPING_ALLOCATION_LABELS[mode]).toBeTruthy();
		}
	});
});
