// Validation d'urgence par la trésorerie (#100).
//
// Le trésorier fait passer un item `pending_cdp` en `pending_bundled` sans
// attendre son CDP, par la seule RPC `cash.fast_track_items` : la base pose la
// trace (`fast_tracked_by`, `fast_tracked_at`), journalise la transition sous
// son nom et prévient chaque CDP du projet par mail. Une validation d'urgence ne
// se confond donc jamais avec une validation CDP.
//
// Typage local : la RPC et les deux colonnes arrivent avec la version de
// `@davincibot/database-types` publiée par DaVinciBot/Supabased (migration
// `20261110090200_fast_track_validation.sql`). Ce module est le seul endroit à
// retoucher une fois le paquet mis à jour : il suffira d'y retirer les casts.

import type { Database } from '@davincibot/database-types';
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

type Client = SupabaseClient<Database>;

interface FastTrackSchema {
	rpc: (
		fn: 'fast_track_items',
		args: { p_item_ids: number[] }
	) => PromiseLike<{ data: number | null; error: PostgrestError | null }>;
	from: (table: 'items') => {
		select: (columns: 'id, fast_tracked_at, fast_tracked_by') => {
			in: (
				column: 'id',
				values: number[]
			) => {
				not: (
					column: 'fast_tracked_at',
					operator: 'is',
					value: null
				) => PromiseLike<{
					data: { id: number; fast_tracked_at: string; fast_tracked_by: string | null }[] | null;
				}>;
			};
		};
	};
}

const cash = (supabase: Client) =>
	(supabase as unknown as { schema: (name: 'cash') => FastTrackSchema }).schema('cash');

/** Valide en urgence les items donnés ; renvoie le nombre d'items réellement passés. */
export async function fastTrackItems(
	supabase: Client,
	itemIds: number[]
): Promise<{ count: number; error: PostgrestError | null }> {
	const { data, error } = await cash(supabase).rpc('fast_track_items', { p_item_ids: itemIds });
	return { count: data ?? 0, error };
}

export interface FastTrack {
	at: string;
	byName: string;
}

/** Trace de validation d'urgence des items donnés, indexée par item. */
export async function fastTracks(
	supabase: Client,
	itemIds: number[]
): Promise<Map<number, FastTrack>> {
	const traces = new Map<number, FastTrack>();
	if (itemIds.length === 0) {
		return traces;
	}
	const { data } = await cash(supabase)
		.from('items')
		.select('id, fast_tracked_at, fast_tracked_by')
		.in('id', itemIds)
		.not('fast_tracked_at', 'is', null);
	const rows = data ?? [];
	if (rows.length === 0) {
		return traces;
	}

	const ids = [...new Set(rows.map((row) => row.fast_tracked_by).filter((id) => id !== null))];
	const { data: profiles } =
		ids.length > 0
			? await supabase.from('profiles').select('id, username').in('id', ids)
			: { data: [] };
	const names = new Map((profiles ?? []).map((p) => [p.id, p.username ?? '']));

	for (const row of rows) {
		// Un profil sans nom d'usage, ou supprimé depuis, se lit comme « la trésorerie ».
		const name = row.fast_tracked_by === null ? '' : (names.get(row.fast_tracked_by) ?? '');
		traces.set(row.id, {
			at: row.fast_tracked_at,
			byName: name.length > 0 ? name : 'la trésorerie'
		});
	}
	return traces;
}
