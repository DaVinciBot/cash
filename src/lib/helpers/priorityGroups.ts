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
			eq: (column: string, value: number) => Result<(PriorityGroupRow & { id: number })[]>;
			is: (
				column: string,
				value: null
			) => { order: (column: string) => Result<{ id: number; name: string | null }[]> };
		};
		delete: () => { in: (column: string, values: number[]) => Result<null> };
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
	const failure = associations.error ?? projects.error;
	if (failure) {
		throw new Error(failure.message);
	}
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

async function currentGroups(supabase: Client, slotId: number) {
	const { data, error } = await untyped(supabase)
		.schema('formation')
		.from('slot_priority_group')
		.select('id, association_id, project_id')
		.eq('slot_id', slotId);
	if (error) {
		throw new Error(error.message);
	}
	return data ?? [];
}

/** Valeurs des groupes prioritaires d'une session ; lève si la lecture échoue. */
export async function slotPriorityGroups(supabase: Client, slotId: number): Promise<string[]> {
	return (await currentGroups(supabase, slotId)).map(priorityValue);
}

/**
 * Remplace les groupes prioritaires d'une session par `values`. Les groupes
 * manquants sont ajoutés avant que les groupes retirés soient supprimés : une
 * erreur en route laisse au pire des groupes en trop, jamais une session
 * ouverte à tous par accident. Seul un groupe que le formulaire proposait
 * (`known`) peut être retiré : un groupe sur un projet archivé depuis reste en place.
 */
export async function saveSlotPriorityGroups(
	supabase: Client,
	slotId: number,
	values: string[],
	known: ReadonlySet<string>
): Promise<void> {
	const table = () => untyped(supabase).schema('formation').from('slot_priority_group');
	const wantedRows = values
		.map(parsePriorityValue)
		.filter((row): row is PriorityGroupRow => row !== null);
	const wanted = new Set(wantedRows.map(priorityValue));
	const current = await currentGroups(supabase, slotId);
	const present = new Set(current.map(priorityValue));
	const toInsert = [...new Map(wantedRows.map((row) => [priorityValue(row), row])).entries()]
		.filter(([value]) => !present.has(value))
		.map(([, row]) => ({ ...row, slot_id: slotId }));
	const toDelete = current
		.filter((row) => known.has(priorityValue(row)) && !wanted.has(priorityValue(row)))
		.map((row) => row.id);
	if (toInsert.length > 0) {
		const { error } = await table().insert(toInsert);
		if (error) {
			throw new Error(error.message);
		}
	}
	if (toDelete.length > 0) {
		const { error } = await table().delete().in('id', toDelete);
		if (error) {
			throw new Error(error.message);
		}
	}
}
