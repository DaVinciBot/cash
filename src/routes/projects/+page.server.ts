import { currentSchoolYear } from '$lib/server/cash';
import type { Campus } from '@davincibot/lib';
import type { PageServerLoad } from './$types';

// Vue de consultation. La gestion de l'arbre des budgets — création, renommage,
// réorganisation, archivage, rattachement des projets, marquage des feuilles par
// défaut — est le périmètre du jalon 6 (TRESO-F-02/02b/02c/05/06). Ici on ne
// fait que lire ce que la vue `cash.budget_consumption` calcule déjà.

interface ProjectOverview {
	id: number;
	name: string;
	campus: Campus | null;
	budgetName: string | null;
	allocatedTtc: number | null;
	consumedTtc: number | null;
	remainingTtc: number | null;
}

export const load: PageServerLoad = async ({ locals }) => {
	const schoolYear = await currentSchoolYear(locals.supabase);

	const { data: projects } = await locals.supabase
		.from('projects')
		.select('id, name, campus, budget_id')
		.is('archived_at', null)
		.order('name');

	const budgetIds = (projects ?? [])
		.map((p) => p.budget_id)
		.filter((id): id is number => id !== null);

	const consumption = new Map<
		number,
		{ name: string; allocated: number; consumed: number; remaining: number }
	>();

	if (budgetIds.length > 0) {
		const { data: rows } = await locals.supabase
			.schema('cash')
			.from('budget_consumption')
			.select('budget_id, name, allocated_ttc, consumed_ttc, remaining_ttc')
			.in('budget_id', budgetIds);

		// Vue bâtie sur une CTE récursive : Postgres déclare toutes ses colonnes
		// nullables, y compris la clé.
		for (const row of rows ?? []) {
			if (row.budget_id === null) {
				continue;
			}
			consumption.set(row.budget_id, {
				name: row.name ?? '',
				allocated: row.allocated_ttc ?? 0,
				consumed: row.consumed_ttc ?? 0,
				remaining: row.remaining_ttc ?? 0
			});
		}
	}

	const overview: ProjectOverview[] = (projects ?? []).map((p) => {
		const budget = p.budget_id ? consumption.get(p.budget_id) : undefined;
		return {
			id: p.id,
			name: p.name ?? '',
			campus: p.campus,
			budgetName: budget?.name ?? null,
			allocatedTtc: budget?.allocated ?? null,
			consumedTtc: budget?.consumed ?? null,
			remainingTtc: budget?.remaining ?? null
		};
	});

	return { projects: overview, schoolYear };
};
