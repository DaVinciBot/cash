import { describe, expect, it } from 'vitest';

import { domainOf, promoCodesFor, promoStatus, type PromoCode } from '#lib/promoCodes.js';

const code = (overrides: Partial<PromoCode> = {}): PromoCode => ({
	id: 1,
	supplier: 'Mouser',
	domain: 'mouser',
	code: 'DVB15',
	discount: '-15 %',
	conditions: null,
	expiresOn: '2026-12-31',
	archivedAt: null,
	...overrides
});

describe('codes promo (#92, #98)', () => {
	it('ramène un lien au domaine de items.domain', () => {
		expect(domainOf('https://eu.mouser.com/ProductDetail/123')).toBe('mouser');
		expect(domainOf('www.ldlc.com')).toBe('ldlc');
		expect(domainOf('https://shop.example.co.uk/item')).toBe('example');
		expect(domainOf('')).toBeNull();
	});

	it("suggère un code actif pour le site d'un lien", () => {
		const codes = [code(), code({ id: 2, domain: 'ldlc', code: 'LD5' })];
		expect(
			promoCodesFor('https://www.mouser.fr/x', codes, '2026-11-09').map((c) => c.code)
		).toEqual(['DVB15']);
	});

	it('ne suggère ni un code expiré ni un code archivé', () => {
		expect(
			promoCodesFor('https://mouser.fr', [code({ expiresOn: '2026-01-01' })], '2026-11-09')
		).toEqual([]);
		expect(
			promoCodesFor('https://mouser.fr', [code({ archivedAt: '2026-10-01' })], '2026-11-09')
		).toEqual([]);
	});

	it('classe un code actif, expiré ou archivé', () => {
		expect(promoStatus(code(), '2026-12-31')).toBe('active');
		expect(promoStatus(code(), '2027-01-01')).toBe('expired');
		expect(promoStatus(code({ archivedAt: '2026-10-01' }), '2026-11-09')).toBe('archived');
		expect(promoStatus(code({ expiresOn: null }), '2030-01-01')).toBe('active');
	});
});
