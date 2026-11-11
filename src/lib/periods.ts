// Rattachement d'une date à une période (exercice fiscal ou année scolaire).
//
// Une année scolaire chevauche deux exercices fiscaux : la liste des flux se
// découpe par l'une ou l'autre, et chacune se retrouve à partir d'une date.

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
