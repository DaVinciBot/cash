import { compareToAverage } from '$lib/helpers/trainingStatsHighlight';
import { describe, expect, it } from 'vitest';

describe('écart à la moyenne', () => {
	it('sépare ce qui dépasse la moyenne de ce qui reste en dessous', () => {
		expect(compareToAverage([1, 5, 6])).toEqual(['below', 'above', 'above']);
	});

	it('laisse neutre une valeur posée exactement sur la moyenne', () => {
		expect(compareToAverage([1, 2, 3])).toEqual(['below', 'neutral', 'above']);
	});

	it('absout les arrondis : une valeur à un cheveu de la moyenne reste neutre', () => {
		expect(compareToAverage([0.1 + 0.2, 0.3, 0.3])).toEqual(['neutral', 'neutral', 'neutral']);
	});

	it('écarte les valeurs indéfinies du calcul et les laisse neutres', () => {
		// Sans le null la moyenne vaut 3 ; en le comptant pour zéro elle tomberait
		// à 2 et le 2 basculerait au vert.
		expect(compareToAverage([2, null, 4])).toEqual(['below', 'neutral', 'above']);
	});

	it('ne compare rien quand une seule valeur est connue', () => {
		expect(compareToAverage([7])).toEqual(['neutral']);
		expect(compareToAverage([7, null])).toEqual(['neutral', 'neutral']);
	});

	it('ne colore pas une colonne dont toutes les valeurs se valent', () => {
		expect(compareToAverage([4, 4, 4])).toEqual(['neutral', 'neutral', 'neutral']);
	});

	it('rend une liste vide sans broncher', () => {
		expect(compareToAverage([])).toEqual([]);
	});
});
