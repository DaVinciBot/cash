import {
	categoryRows,
	fetchStatsSlots,
	participantRows,
	pivotByPeriod,
	pivotPercentSeries,
	pivotSeries,
	resolveRange,
	totals,
	trainerRows,
	weeklyRows
} from '$lib/server/trainingStats';
import { getParisDateKey } from '@davincibot/lib';
import type { PageServerLoad } from './$types';

// Statistiques des formations — la feuille « Stats » du classeur, tenue à jour
// toute seule.
//
// La plage vit dans l'URL (`?from=&to=&period=`) : un écran de statistiques se
// partage, et un lien qui ne porte pas sa plage ne montre pas la même chose au
// destinataire qu'à l'expéditeur.

export const load: PageServerLoad = async ({ locals, url, depends }) => {
	depends('trainings:stats');

	const range = resolveRange(
		{
			from: url.searchParams.get('from'),
			to: url.searchParams.get('to'),
			period: url.searchParams.get('period')
		},
		getParisDateKey(new Date())
	);

	const { slots, failed } = await fetchStatsSlots(locals.supabase, range);
	const pivot = pivotByPeriod(slots, range);

	return {
		range,
		failed,
		weeks: weeklyRows(slots, range),
		categories: categoryRows(slots),
		trainers: trainerRows(slots),
		participants: participantRows(slots),
		pivot,
		stacked: pivotSeries(pivot),
		stackedPercent: pivotPercentSeries(pivot),
		grandTotal: totals(slots)
	};
};
