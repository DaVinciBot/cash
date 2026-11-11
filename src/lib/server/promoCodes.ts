// Accès serveur aux codes promotionnels (#92, #98).
//
// Typage local : la table `cash.promo_codes` arrive avec la version de
// `@davincibot/database-types` publiée par DaVinciBot/Supabased (migration
// `20261110090700_promo_codes.sql`). Ce module est le seul endroit à retoucher
// une fois le paquet mis à jour : il suffira d'y retirer les casts.

import type { PromoCode } from '#lib/promoCodes.js';
import type { Database } from '@davincibot/database-types';
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

type Client = SupabaseClient<Database>;

interface PromoRow {
	id: number;
	supplier: string;
	domain: string;
	code: string;
	discount: string;
	conditions: string | null;
	expires_on: string | null;
	archived_at: string | null;
}

type PromoInsert = Omit<PromoRow, 'id' | 'archived_at'>;

interface PromoTable {
	select: (columns: string) => {
		order: (
			column: 'supplier',
			options: { ascending: boolean }
		) => PromiseLike<{ data: PromoRow[] | null; error: PostgrestError | null }>;
	};
	insert: (row: PromoInsert) => PromiseLike<{ error: PostgrestError | null }>;
	update: (values: Partial<PromoRow>) => {
		eq: (column: 'id', value: number) => PromiseLike<{ error: PostgrestError | null }>;
	};
}

const table = (supabase: Client) =>
	(
		supabase as unknown as {
			schema: (name: 'cash') => { from: (table: 'promo_codes') => PromoTable };
		}
	)
		.schema('cash')
		.from('promo_codes');

const COLUMNS = 'id, supplier, domain, code, discount, conditions, expires_on, archived_at';

/** Tous les codes, par fournisseur. Une lecture refusée vaut liste vide. */
export async function promoCodes(supabase: Client): Promise<PromoCode[]> {
	const { data } = await table(supabase).select(COLUMNS).order('supplier', { ascending: true });
	return (data ?? []).map((row) => ({
		id: row.id,
		supplier: row.supplier,
		domain: row.domain,
		code: row.code,
		discount: row.discount,
		conditions: row.conditions,
		expiresOn: row.expires_on,
		archivedAt: row.archived_at
	}));
}

export async function createPromoCode(
	supabase: Client,
	values: PromoInsert
): Promise<PostgrestError | null> {
	const { error } = await table(supabase).insert(values);
	return error;
}

export async function setPromoArchived(
	supabase: Client,
	id: number,
	archived: boolean
): Promise<PostgrestError | null> {
	const { error } = await table(supabase)
		.update({ archived_at: archived ? new Date().toISOString() : null })
		.eq('id', id);
	return error;
}
