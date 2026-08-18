import { describe, expect, it } from 'vitest';

import { resolveCampus } from '$lib/server/cash';
import {
	CAMPUS_BADGES,
	cashErrorMessage,
	isItemDeletableByMember,
	isItemEditableByMember,
	isItemRefused,
	ITEM_STATE_BADGES,
	ITEM_STATES
} from '@davincibot/lib';

describe('résolution du campus de destination (CMD-F-43 / CMD-F-46)', () => {
	it('déduit le campus quand projet et membre concordent, sans rien demander', () => {
		expect(resolveCampus('nantes', 'nantes')).toEqual({
			campus: 'nantes',
			needsChoice: false,
			diverges: false
		});
	});

	it('déduit du projet quand le membre ne porte pas de campus', () => {
		expect(resolveCampus('paris', null)).toEqual({
			campus: 'paris',
			needsChoice: false,
			diverges: false
		});
	});

	it('déduit du membre quand le projet ne porte pas de campus', () => {
		expect(resolveCampus(null, 'nantes')).toEqual({
			campus: 'nantes',
			needsChoice: false,
			diverges: false
		});
	});

	// La divergence n'est pas arbitrée par une règle : les deux lectures se
	// défendent, donc la question va au membre — c'est lui qui reçoit le colis.
	it('demande de trancher quand projet et membre divergent', () => {
		const resolved = resolveCampus('nantes', 'paris');
		expect(resolved.needsChoice).toBe(true);
		expect(resolved.diverges).toBe(true);
		expect(resolved.campus).toBeNull();
	});

	// Sans aucun campus, la base lèverait DVB01 « campus indéterminable » : on pose
	// la question en amont plutôt que de renvoyer une erreur technique au membre.
	it('demande de trancher quand aucun des deux ne porte de campus', () => {
		const resolved = resolveCampus(null, null);
		expect(resolved.needsChoice).toBe(true);
		expect(resolved.diverges).toBe(false);
		expect(resolved.campus).toBeNull();
	});
});

describe("référentiel des états d'item (CMD-F-20 / CMD-F-22)", () => {
	it("couvre exactement les six états de l'enum cash.item_state", () => {
		expect(ITEM_STATES).toEqual([
			'pending_cdp',
			'pending_bundled',
			'bundled',
			'received',
			'refused_cdp',
			'refused_treso'
		]);
	});

	it('donne un badge à chaque état, sans trou', () => {
		for (const state of ITEM_STATES) {
			expect(ITEM_STATE_BADGES[state].label).toBeTruthy();
			expect(ITEM_STATE_BADGES[state].emoji).toBeTruthy();
			expect(ITEM_STATE_BADGES[state].className).toBeTruthy();
		}
	});

	// Les deux refus doivent rester distinguables à l'œil : leur nature change ce
	// que le membre doit faire ensuite (§5.3).
	it('distingue visuellement les deux refus', () => {
		expect(ITEM_STATE_BADGES.refused_cdp.label).not.toBe(ITEM_STATE_BADGES.refused_treso.label);
		expect(ITEM_STATE_BADGES.refused_cdp.className).not.toBe(
			ITEM_STATE_BADGES.refused_treso.className
		);
	});

	it('distingue visuellement Nantes et Paris', () => {
		expect(CAMPUS_BADGES.nantes.className).not.toBe(CAMPUS_BADGES.paris.className);
	});
});

describe('droits du membre sur ses items (CMD-F-02)', () => {
	// Miroir de la policy items_update : seul pending_cdp reste modifiable.
	it("ne laisse modifier qu'un item en revue par le CDP", () => {
		expect(isItemEditableByMember('pending_cdp')).toBe(true);
		for (const state of ITEM_STATES.filter((s) => s !== 'pending_cdp')) {
			expect(isItemEditableByMember(state)).toBe(false);
		}
	});

	// Miroir de la policy items_delete : un item validé ou regroupé engage déjà le
	// trésorier, un item reçu est arrivé.
	it('laisse supprimer un item en revue ou refusé, jamais un item engagé', () => {
		expect(isItemDeletableByMember('pending_cdp')).toBe(true);
		expect(isItemDeletableByMember('refused_cdp')).toBe(true);
		expect(isItemDeletableByMember('refused_treso')).toBe(true);
		expect(isItemDeletableByMember('pending_bundled')).toBe(false);
		expect(isItemDeletableByMember('bundled')).toBe(false);
		expect(isItemDeletableByMember('received')).toBe(false);
	});

	it('reconnaît les deux états de refus comme terminaux', () => {
		expect(isItemRefused('refused_cdp')).toBe(true);
		expect(isItemRefused('refused_treso')).toBe(true);
		expect(isItemRefused('bundled')).toBe(false);
	});
});

describe("traduction des codes d'erreur de la base", () => {
	// On branche sur error.code, jamais sur error.message, qui est en français et
	// non versionné (Supabased/docs/ERROR_CODES.md).
	it('traduit un code métier connu', () => {
		expect(cashErrorMessage('DVB02', 'repli')).toContain('close');
	});

	it('retombe sur le message fourni pour un code inconnu ou absent', () => {
		expect(cashErrorMessage('XX999', 'repli')).toBe('repli');
		expect(cashErrorMessage(null, 'repli')).toBe('repli');
		expect(cashErrorMessage(undefined, 'repli')).toBe('repli');
	});
});
