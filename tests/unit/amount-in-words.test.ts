import { describe, expect, it } from 'vitest';

import { amountInWords } from '@davincibot/lib';

// Mention obligatoire du reçu fiscal (Cerfa 11580) : le montant s'écrit aussi en
// toutes lettres. Une mention fausse sur une pièce fiscale coûte plus cher
// qu'une mention absente, d'où les cas limites de la langue.
describe('montant en toutes lettres', () => {
	it('écrit les montants simples', () => {
		expect(amountInWords(0)).toBe('zéro euro');
		expect(amountInWords(1)).toBe('un euro');
		expect(amountInWords(2)).toBe('deux euros');
		expect(amountInWords(17)).toBe('dix-sept euros');
	});

	it('accorde vingt et cent selon ce qui les suit', () => {
		expect(amountInWords(80)).toBe('quatre-vingts euros');
		expect(amountInWords(81)).toBe('quatre-vingt-un euros');
		expect(amountInWords(100)).toBe('cent euros');
		expect(amountInWords(200)).toBe('deux-cents euros');
		expect(amountInWords(201)).toBe('deux-cent-un euros');
	});

	// Le français compte soixante-dix à partir de soixante, et quatre-vingt-dix à
	// partir de quatre-vingt : la dizaine ne suffit pas à décider.
	it('gère les dizaines composées', () => {
		expect(amountInWords(71)).toBe('soixante-et-onze euros');
		expect(amountInWords(75)).toBe('soixante-quinze euros');
		expect(amountInWords(91)).toBe('quatre-vingt-onze euros');
		expect(amountInWords(99)).toBe('quatre-vingt-dix-neuf euros');
		expect(amountInWords(21)).toBe('vingt-et-un euros');
	});

	it('n’écrit jamais « un mille »', () => {
		expect(amountInWords(1000)).toBe('mille euros');
		expect(amountInWords(2000)).toBe('deux-mille euros');
		expect(amountInWords(1200)).toBe('mille-deux-cents euros');
	});

	it('écrit les centimes séparément', () => {
		expect(amountInWords(1.5)).toBe('un euro et cinquante centimes');
		expect(amountInWords(0.01)).toBe('zéro euro et un centime');
		expect(amountInWords(184.7)).toBe('cent-quatre-vingt-quatre euros et soixante-dix centimes');
	});

	// Mieux vaut pas de mention qu'une mention fausse.
	it('refuse ce qui n’est pas un montant positif', () => {
		expect(amountInWords(-1)).toBeNull();
		expect(amountInWords(Number.NaN)).toBeNull();
		expect(amountInWords(Number.POSITIVE_INFINITY)).toBeNull();
	});
});
