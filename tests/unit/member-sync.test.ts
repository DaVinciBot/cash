import { describe, expect, it } from 'vitest';

import { absentMembers, demotionPrompt } from '../../src/lib/memberSync';

describe('synchronisation des membres (cash#79)', () => {
	const emails = new Map([
		['a', 'Alice@Example.com'],
		['b', 'bob@example.com'],
		['c', 'carol@example.com'],
		['self', 'me@example.com']
	]);

	it('retient les membres absents du CSV, sans tenir compte de la casse', () => {
		const csv = new Set(['alice@example.com']);
		expect(absentMembers(['a', 'b', 'c', 'b'], emails, csv, null)).toEqual([
			{ id: 'b', email: 'bob@example.com' },
			{ id: 'c', email: 'carol@example.com' }
		]);
	});

	it("n'inclut jamais l'auteur de la synchronisation ni un profil sans email", () => {
		expect(absentMembers(['self', 'ghost'], emails, new Set(), 'self')).toEqual([]);
	});

	it('cite au plus dix adresses dans la confirmation', () => {
		const absent = Array.from({ length: 12 }, (_, index) => ({
			id: String(index),
			email: `m${String(index)}@example.com`
		}));
		const prompt = demotionPrompt(absent);
		expect(prompt.startsWith('12 membres absents du CSV vont redevenir invités')).toBe(true);
		expect(prompt).toContain('... et 2 autre(s).');
		expect(demotionPrompt([])).toBe('');
	});
});
