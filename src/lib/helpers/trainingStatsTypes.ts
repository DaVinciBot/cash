// Modèle de vue des statistiques de formation.
//
// Ces types vivent hors de `$lib/server` parce que les composants les
// consomment : le calcul reste au serveur, la forme de son résultat est
// publique. Sans cette séparation, un simple `import type` dans un composant
// tirerait un module serveur dans le graphe client.

import type { TrainingCategory } from '@davincibot/lib';

export interface StatsRange {
	/** Jour parisien inclus, `YYYY-MM-DD`. */
	from: string;
	/** Jour parisien inclus, `YYYY-MM-DD`. */
	to: string;
	/** Longueur des tranches du tableau croisé, en jours. */
	periodDays: number;
}

export interface StatsTotals {
	slots: number;
	hours: number;
	attendees: number;
	seats: number;
	/** Formé·es par formation. `null` sans aucune formation. */
	average: number | null;
	/** Formé·es rapporté·es aux places. `null` si aucune place proposée. */
	fillRate: number | null;
	/** Formations distinctes, et non créneaux : une formation redonnée compte une fois. */
	trainingTypes: number;
}

export interface GroupRow extends StatsTotals {
	key: string;
	label: string;
}

export interface WeekRow {
	key: string;
	label: string;
	slots: number;
	attendees: number;
	seats: number;
	hours: number;
}

export interface PivotRow {
	key: string;
	label: string;
	counts: number[];
	total: number;
}

export interface PivotTable {
	categories: { value: TrainingCategory; label: string }[];
	rows: PivotRow[];
	totals: { counts: number[]; total: number };
}

export interface ParticipantRow {
	name: string;
	slots: number;
	hours: number;
}

export interface Series {
	label: string;
	values: number[];
}
