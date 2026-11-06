// Tables des projets (TRESO-F-01/02), en cours et archivés. Elles lisent `public.projects`
// par deux vues, depuis le navigateur : la RLS décide seule de ce que chacun voit. Le chemin du budget
// désigné et le nombre d'items viennent du schéma `cash`, lus par page.

import type { DBInfo, Filter } from '@davincibot/components';
import { CAMPUS_BADGES, type Campus } from '@davincibot/lib';
import { getSupabaseBrowserClient } from '@davincibot/lib/supabase';

const PROJECT_KEY = 'id,name,campus,budget_id,archived_at';

export const ACTIVE_PROJECTS_DB: DBInfo = {
	table: 'active_projects',
	key: PROJECT_KEY,
	ordering: 'name:asc'
};

export const ARCHIVED_PROJECTS_DB: DBInfo = {
	table: 'archived_projects',
	key: PROJECT_KEY,
	ordering: 'name:asc'
};

export const PROJECT_FILTERS: Filter[] = [
	{
		category: 'Campus',
		value: 'campus',
		options: (Object.keys(CAMPUS_BADGES) as Campus[]).map((campus) => ({
			name: CAMPUS_BADGES[campus].label,
			value: campus
		}))
	}
];

interface ProjectDbRow {
	id: number;
	name: string;
	campus: Campus | null;
	budget_id: number | null;
	archived_at: string | null;
}

export interface ProjectRow {
	id: number;
	name: string;
	campus: Campus | null;
	budgetId: number | null;
	budgetPath: string | null;
	archivedAt: string | null;
	/** Un projet référencé par des items ne se supprime pas — il s'archive. */
	itemCount: number;
}

/** Met en forme les projets d'une page, avec le chemin de leur budget et leur nombre d'items. */
export async function parseProjectRows(rows: unknown[]): Promise<ProjectRow[]> {
	const list = rows as ProjectDbRow[];
	if (list.length === 0) {
		return [];
	}

	const cash = getSupabaseBrowserClient().schema('cash');
	const [{ data: budgets }, { data: items }] = await Promise.all([
		cash.from('budgets').select('id, name, parent_id'),
		cash
			.from('items')
			.select('project_id')
			.in(
				'project_id',
				list.map((row) => row.id)
			)
	]);

	const byId = new Map((budgets ?? []).map((budget) => [budget.id, budget]));
	const path = (id: number | null): string | null => {
		if (id === null) {
			return null;
		}
		const parts: string[] = [];
		let current = byId.get(id);
		let depth = 0;
		while (current && depth < 32) {
			parts.unshift(current.name);
			current = current.parent_id === null ? undefined : byId.get(current.parent_id);
			depth += 1;
		}
		return parts.length > 0 ? parts.join(' › ') : null;
	};

	const counts = new Map<number, number>();
	for (const item of items ?? []) {
		counts.set(item.project_id, (counts.get(item.project_id) ?? 0) + 1);
	}

	return list.map((row) => ({
		id: row.id,
		name: row.name,
		campus: row.campus,
		budgetId: row.budget_id,
		budgetPath: path(row.budget_id),
		archivedAt: row.archived_at,
		itemCount: counts.get(row.id) ?? 0
	}));
}
