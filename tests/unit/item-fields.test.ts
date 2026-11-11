import { describe, expect, it } from 'vitest';

import { isHttpUrl, itemFieldsError, knownTags } from '../../src/lib/itemFields';

describe('isHttpUrl', () => {
	it('accepte une adresse http ou https complète', () => {
		expect(isHttpUrl('https://eu.mouser.com/ProductDetail/123')).toBe(true);
		expect(isHttpUrl('http://example.com')).toBe(true);
	});

	it('refuse une adresse sans schéma ou dans un autre schéma', () => {
		expect(isHttpUrl('mouser.com/123')).toBe(false);
		expect(isHttpUrl('javascript:alert(1)')).toBe(false);
		expect(isHttpUrl('')).toBe(false);
	});
});

describe('knownTags', () => {
	it('écarte les valeurs inconnues et les doublons', () => {
		expect(knownTags(['info', 'cuisine', 'info', 42, 'méca'])).toEqual(['méca', 'info']);
	});
});

describe('itemFieldsError', () => {
	it('exige un lien', () => {
		expect(itemFieldsError('', ['info'])).toBe('Le lien est obligatoire.');
	});

	it('exige un lien web complet', () => {
		expect(itemFieldsError('mouser.com', ['info'])).toMatch(/adresse web complète/);
	});

	it("exige au moins un tag d'équipe", () => {
		expect(itemFieldsError('https://mouser.com', [])).toMatch(/au moins un tag/);
	});

	it('préfixe le message par la ligne du panier', () => {
		expect(itemFieldsError('', ['info'], 'Ligne 2 : ')).toBe('Ligne 2 : le lien est obligatoire.');
	});

	it('valide une saisie complète', () => {
		expect(itemFieldsError('https://mouser.com', ['élek'])).toBeNull();
	});
});
