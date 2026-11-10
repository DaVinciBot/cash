// Groupes prioritaires d'une session (formation#52) : des associations ou des
// projets dont les membres sont inscrits directement jusqu'à la libération des
// places, 24 h avant le début.
//
// Typage local : `public.associations` et `formation.slot_priority_group`
// arrivent avec la prochaine version de `@davincibot/database-types`
// (DaVinciBot/Supabased#37).
import type { SelectOption } from '@davincibot/lib';
import type { getSupabaseBrowserClient } from '@davincibot/lib/supabase';

type Client = ReturnType<typeof getSupabaseBrowserClient>;

export interface PriorityGroupRow {
	association_id: number | null;
	project_id: number | null;
}

type Result<T> = PromiseLike<{ data: T | null; error: { message: string } | null }>;

interface Untyped {
	from: (table: string) => {
		select: (columns: string) => {
			order: (column: string) => Result<{ id: number; name: string | null }[]>;
			eq: (column: string, value: number) => Result<PriorityGroupRow[]>;
			is: (
				column: string,
				value: null
			) => { order: (column: string) => Result<{ id: number; name: string | null }[]> };
		};
		delete: () => { eq: (column: string, value: number) => Result<null> };
		insert: (rows: (PriorityGroupRow & { slot_id: number })[]) => Result<null>;
	};
	schema: (name: 'formation') => Pick<Untyped, 'from'>;
}

const untyped = (supabase: Client) => supabase as unknown as Untyped;

/** Valeur d'option : `a:<id>` pour une association, `p:<id>` pour un projet. */
export function priorityValue(row: PriorityGroupRow): string {
	return row.association_id !== null
		? `a:${String(row.association_id)}`
		: `p:${String(row.project_id)}`;
}

/** Lit une valeur d'option ; `null` si elle n'est pas reconnue. */
export function parsePriorityValue(value: string): PriorityGroupRow | null {
	const match = /^([ap]):(\d+)$/.exec(value);
	if (!match) {
		return null;
	}
	const id = Number(match[2]);
	return match[1] === 'a'
		? { association_id: id, project_id: null }
		: { association_id: null, project_id: id };
}

/** Associations puis projets en cours, comme options du sélecteur. */
export async function priorityGroupOptions(supabase: Client): Promise<SelectOption[]> {
	const client = untyped(supabase);
	const [associations, projects] = await Promise.all([
		client.from('associations').select('id, name').order('name'),
		client.from('projects').select('id, name').is('archived_at', null).order('name')
	]);
	return [
		...(associations.data ?? []).map((row) => ({
			value: `a:${String(row.id)}`,
			text: `Association : ${row.name ?? ''}`
		})),
		...(projects.data ?? []).map((row) => ({
			value: `p:${String(row.id)}`,
			text: `Projet : ${row.name ?? ''}`
		}))
	];
}

/** Valeurs des groupes prioritaires d'une session. */
export async function slotPriorityGroups(supabase: Client, slotId: number): Promise<string[]> {
	const { data } = await untyped(supabase)
		.schema('formation')
		.from('slot_priority_group')
		.select('association_id, project_id')
		.eq('slot_id', slotId);
	return (data ?? []).map(priorityValue);
}

/** Remplace les groupes prioritaires d'une session par `values`. */
export async function saveSlotPriorityGroups(
	supabase: Client,
	slotId: number,
	values: string[]
): Promise<void> {
	const table = () => untyped(supabase).schema('formation').from('slot_priority_group');
	const rows = [...new Set(values)]
		.map(parsePriorityValue)
		.filter((row): row is PriorityGroupRow => row !== null)
		.map((row) => ({ ...row, slot_id: slotId }));
	const { error: deleteError } = await table().delete().eq('slot_id', slotId);
	if (deleteError) {
		throw new Error(deleteError.message);
	}
	if (rows.length === 0) {
		return;
	}
	const { error: insertError } = await table().insert(rows);
	if (insertError) {
		throw new Error(insertError.message);
	}
}
