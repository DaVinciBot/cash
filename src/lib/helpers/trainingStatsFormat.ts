// Écriture des grandeurs des statistiques de formation.
//
// Une seule règle porte tout le fichier : une valeur indéfinie s'écrit « — »,
// jamais zéro. Un remplissage sans place proposée et une moyenne sans formation
// ne sont pas des contre-performances, ce sont des mesures qui n'existent pas.

import type { StatsRange } from '$lib/helpers/trainingStatsTypes';

/** Ce que l'on écrit à la place d'un nombre qui n'a pas de sens ici. */
const UNDEFINED_VALUE = '—';

const decimal = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const longDate = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'UTC' });

export function formatDecimal(value: number | null | undefined): string {
	return value === null || value === undefined ? UNDEFINED_VALUE : decimal.format(value);
}

/** Un taux donné entre 0 et 1, rendu en pourcentage entier. */
export function formatRatio(value: number | null | undefined): string {
	return value === null || value === undefined
		? UNDEFINED_VALUE
		: `${percent.format(value * 100)} %`;
}

export function formatHours(value: number | null | undefined): string {
	return value === null || value === undefined ? UNDEFINED_VALUE : `${decimal.format(value)} h`;
}

/** « du 6 avril 2026 au 26 avril 2026 » — la plage lue par la page. */
export function formatRangeLabel(range: StatsRange): string {
	const from = longDate.format(new Date(`${range.from}T00:00:00Z`));
	const to = longDate.format(new Date(`${range.to}T00:00:00Z`));
	return `du ${from} au ${to}`;
}
