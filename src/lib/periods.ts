// Rattachement d'une date à une période (exercice fiscal ou année scolaire).
//
// La base fait foi : `flows_assign_fiscal_year` déduit l'exercice d'un flux de
// sa date et refuse un exercice clos (DVB41). Ce module rend la même règle
// lisible AVANT l'envoi — l'écran affiche l'exercice qui sera retenu et bloque
// une date tombant dans un exercice clos — sans jamais la remplacer.

export interface PeriodRange {
	id: number;
	label: string;
	startsOn: string;
	endsOn: string;
	closedAt: string | null;
}

/** Période qui couvre la date ISO `day`, bornes comprises. */
export function periodFor<T extends PeriodRange>(day: string, periods: readonly T[]): T | null {
	return periods.find((period) => period.startsOn <= day && day <= period.endsOn) ?? null;
}

export const CLOSED_FISCAL_YEAR_MESSAGE =
	"Impossible d'enregistrer ce flux : la date indiquée correspond à un exercice fiscal déjà clôturé.";

/** Problème de rattachement d'une date à un exercice, `null` si elle est acceptable. */
export function fiscalYearProblem(day: string, fiscalYears: readonly PeriodRange[]): string | null {
	const year = periodFor(day, fiscalYears);
	if (!year) {
		return 'Aucun exercice fiscal ne couvre cette date : ouvrez-le depuis la trésorerie.';
	}
	return year.closedAt ? CLOSED_FISCAL_YEAR_MESSAGE : null;
}
