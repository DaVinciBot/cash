import { currentSchoolYear } from '$lib/server/cash';
import { charts, projectReport, quarterlyReport } from '$lib/server/reports';
import { periods } from '$lib/server/treasury';
import type { PageServerLoad } from './$types';

// Rapports trimestriels et par projet (TRESO-F-62), graphiques (TRESO-F-50).
//
// Deux découpages cohabitent et c'est voulu (§7.1bis) : les flux se lisent par
// exercice fiscal, les items et les budgets par année scolaire. L'écran porte
// donc DEUX sélecteurs plutôt qu'un seul qui mentirait sur l'un des deux.

export const load: PageServerLoad = async ({ locals, url, depends }) => {
	depends('cash:reports');

	const periodRows = await periods(locals.supabase);
	const today = new Date().toISOString().slice(0, 10);

	const askedFiscal = Number(url.searchParams.get('fy'));
	const fiscalYearId =
		Number.isSafeInteger(askedFiscal) && askedFiscal > 0
			? askedFiscal
			: (periodRows.fiscalYears.find((y) => y.startsOn <= today && today <= y.endsOn)?.id ??
				periodRows.fiscalYears.at(0)?.id ??
				null);

	const askedSchool = Number(url.searchParams.get('sy'));
	const current = await currentSchoolYear(locals.supabase);
	const schoolYearId =
		Number.isSafeInteger(askedSchool) && askedSchool > 0
			? askedSchool
			: (current?.id ?? periodRows.schoolYears.at(0)?.id ?? null);

	const [quarters, projects, chartData] = await Promise.all([
		fiscalYearId === null ? Promise.resolve(null) : quarterlyReport(locals.supabase, fiscalYearId),
		schoolYearId === null ? Promise.resolve([]) : projectReport(locals.supabase, schoolYearId),
		fiscalYearId === null || schoolYearId === null
			? Promise.resolve(null)
			: charts(locals.supabase, fiscalYearId, schoolYearId)
	]);

	return {
		periods: periodRows,
		fiscalYearId,
		schoolYearId,
		quarters,
		projects,
		charts: chartData
	};
};
