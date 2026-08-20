export type Trend = 'above' | 'below' | 'neutral';

/** Sous ce seuil relatif, l'écart n'est plus qu'un résidu d'arrondi. */
const EPSILON = 1e-9;

function known(value: number | null | undefined): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Situe chaque valeur d'une colonne par rapport à la moyenne de cette colonne,
 * dans l'ordre reçu.
 */
export function compareToAverage(values: readonly (number | null | undefined)[]): Trend[] {
	const comparable = values.filter(known);
	if (comparable.length < 2) {
		return values.map(() => 'neutral');
	}

	const average = comparable.reduce((sum, value) => sum + value, 0) / comparable.length;
	const tolerance = EPSILON * Math.max(1, Math.abs(average));

	return values.map((value) => {
		if (!known(value)) {
			return 'neutral';
		}
		if (value > average + tolerance) {
			return 'above';
		}
		return value < average - tolerance ? 'below' : 'neutral';
	});
}
