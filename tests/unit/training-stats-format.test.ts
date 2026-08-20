import { describe, expect, it } from 'vitest';

import {
	formatDecimal,
	formatHours,
	formatRangeLabel,
	formatRatio
} from '$lib/helpers/trainingStatsFormat';

// Écriture des grandeurs à l'écran. Le cas qui compte est la valeur indéfinie :
// un remplissage sans place proposée et une moyenne sans formation ne valent
// pas zéro, et les afficher « 0 % » ferait lire une contre-performance là où il
// n'y a simplement rien à mesurer.

describe('écriture des grandeurs', () => {
	it('écrit un taux en pourcentage entier', () => {
		expect(formatRatio(0.5751789976133651)).toBe('58 %');
	});

	it('écrit une moyenne avec deux décimales, à la française', () => {
		expect(formatDecimal(2.9390243902439024)).toBe('2,94');
	});

	it('écrit les heures avec leur unité', () => {
		expect(formatHours(102.5)).toBe('102,5 h');
	});

	it('rend un tiret cadratin sur une valeur indéfinie', () => {
		expect(formatRatio(null)).toBe('—');
		expect(formatDecimal(null)).toBe('—');
	});

	it('distingue zéro de l’absence de valeur', () => {
		expect(formatRatio(0)).toBe('0 %');
		expect(formatDecimal(0)).toBe('0');
	});
});

describe('libellé de la plage', () => {
	it('énonce la plage en toutes lettres', () => {
		expect(formatRangeLabel({ from: '2026-04-06', to: '2026-04-26', periodDays: 21 })).toBe(
			'du 6 avril 2026 au 26 avril 2026'
		);
	});
});
