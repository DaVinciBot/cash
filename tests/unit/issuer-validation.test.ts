import { describe, expect, it } from 'vitest';

import {
	isValidBic,
	isValidIban,
	isValidRna,
	isValidSiret,
	issuerFieldErrors,
	normalizeIdentifier
} from '#lib/issuerValidation.js';
import { formatNumber, rankOf } from '#lib/server/documentNumbering.js';

const empty = {
	rna: '',
	siret: '',
	iban: '',
	bic: '',
	email: '',
	website: '',
	postalCode: '',
	country: 'France'
};

describe("mentions légales de l'émetteur (#80)", () => {
	it('reconnaît un RNA', () => {
		expect(isValidRna('W751234567')).toBe(true);
		expect(isValidRna('w 751 234 567')).toBe(true);
		expect(isValidRna('751234567')).toBe(false);
	});

	it('vérifie la clé du SIRET', () => {
		// SIRET de démonstration valide au sens de Luhn.
		expect(isValidSiret('732 829 320 00074')).toBe(true);
		expect(isValidSiret('73282932000075')).toBe(false);
		expect(isValidSiret('7328293200007')).toBe(false);
	});

	it('vérifie la clé de l’IBAN', () => {
		expect(isValidIban('FR76 3000 6000 0112 3456 7890 189')).toBe(true);
		expect(isValidIban('FR76 3000 6000 0112 3456 7890 188')).toBe(false);
	});

	it('reconnaît un BIC de 8 ou 11 caractères', () => {
		expect(isValidBic('AGRIFRPP')).toBe(true);
		expect(isValidBic('agrifrpp882')).toBe(true);
		expect(isValidBic('AGRIFR')).toBe(false);
	});

	it('laisse passer les champs vides', () => {
		expect(issuerFieldErrors(empty)).toEqual([]);
	});

	it('signale chaque champ mal formé', () => {
		const errors = issuerFieldErrors({
			...empty,
			rna: '123',
			iban: 'FR00',
			email: 'tresorerie',
			website: 'davincibot.fr',
			postalCode: '9200'
		});
		expect(errors).toHaveLength(5);
	});

	it("n'impose le code postal à cinq chiffres qu'en France", () => {
		expect(issuerFieldErrors({ ...empty, postalCode: 'SW1A 1AA', country: 'Royaume-Uni' })).toEqual(
			[]
		);
	});

	it('enregistre les identifiants sans espaces et en capitales', () => {
		expect(normalizeIdentifier(' fr76 3000 6000 ')).toBe('FR7630006000');
	});
});

describe('numérotation des documents (#81)', () => {
	it("lit le rang final d'un numéro", () => {
		expect(rankOf('FAC-2026-0151')).toBe(151);
		expect(rankOf('sans rang')).toBe(0);
	});

	it('formate un numéro sur quatre chiffres', () => {
		expect(formatNumber('invoice', 2026, 151)).toBe('FAC-2026-0151');
		expect(formatNumber('tax_receipt', 2027, 1)).toBe('REC-2027-0001');
	});
});
