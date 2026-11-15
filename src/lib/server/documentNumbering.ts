// Reprise de l'historique de numérotation des documents (#81).
//
// Une série est numérotée par type et par année (`FAC-2026-0001`). Les pièces
// émises à la main avant le site n'existent pas en base : pour qu'elles ne
// soient pas doublonnées, le trésorier déclare, par série, le dernier rang émis
// hors du site, et `cash.next_document_number` repart du plus grand des deux.
//
// Typage local : la table `cash.document_number_offsets` arrive avec la version
// de `@davincibot/database-types` publiée par DaVinciBot/Supabased (migration
// `20261110090300_document_order_numbering.sql`). Ce module est le seul endroit
// à retoucher une fois le paquet mis à jour : il suffira d'y retirer les casts.

import { DOCUMENT_KINDS, type DocumentKind } from '#lib/types/domain.js';
import type { Database } from '@davincibot/database-types';
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

type Client = SupabaseClient<Database>;

interface OffsetRow {
	kind: DocumentKind;
	year: number;
	last_manual_rank: number;
}

interface OffsetsTable {
	from: (table: 'document_number_offsets') => {
		select: (columns: 'kind, year, last_manual_rank') => {
			eq: (column: 'year', value: number) => PromiseLike<{ data: OffsetRow[] | null }>;
		};
		upsert: (
			rows: OffsetRow[],
			options: { onConflict: 'kind,year' }
		) => PromiseLike<{ error: PostgrestError | null }>;
	};
}

const offsets = (supabase: Client) =>
	(supabase as unknown as { schema: (name: 'cash') => OffsetsTable }).schema('cash');

export const DOCUMENT_PREFIXES: Record<DocumentKind, string> = {
	expense_report: 'NDF',
	quote: 'DEV',
	invoice: 'FAC',
	tax_receipt: 'REC'
};

export interface SeriesNumbering {
	kind: DocumentKind;
	year: number;
	/** Dernier rang émis hors du site, 0 si rien n'est déclaré. */
	manualRank: number;
	/** Dernier rang émis par le site. */
	siteRank: number;
	/** Numéro que portera le prochain document de la série. */
	next: string;
}

/** Rang final d'un numéro `PRE-AAAA-NNNN`, 0 s'il n'en porte pas. */
export function rankOf(number: string): number {
	const match = /(\d+)$/.exec(number);
	return match ? Number(match[1]) : 0;
}

export function formatNumber(kind: DocumentKind, year: number, rank: number): string {
	return `${DOCUMENT_PREFIXES[kind]}-${String(year)}-${String(rank).padStart(4, '0')}`;
}

/** État de chaque série de l'année : ce qui a été émis, où, et le prochain numéro. */
export async function seriesNumbering(supabase: Client, year: number): Promise<SeriesNumbering[]> {
	const [{ data: declared }, { data: generated }] = await Promise.all([
		offsets(supabase)
			.from('document_number_offsets')
			.select('kind, year, last_manual_rank')
			.eq('year', year),
		supabase
			.schema('cash')
			.from('generated_documents')
			.select('kind, number')
			.gte('issued_on', `${String(year)}-01-01`)
			.lte('issued_on', `${String(year)}-12-31`)
	]);

	return DOCUMENT_KINDS.map((kind) => {
		const manualRank = (declared ?? []).find((row) => row.kind === kind)?.last_manual_rank ?? 0;
		const siteRank = Math.max(
			0,
			...(generated ?? [])
				.filter(
					(row) =>
						row.kind === kind &&
						row.number.startsWith(`${DOCUMENT_PREFIXES[kind]}-${String(year)}-`)
				)
				.map((row) => rankOf(row.number))
		);
		return {
			kind,
			year,
			manualRank,
			siteRank,
			next: formatNumber(kind, year, Math.max(manualRank, siteRank) + 1)
		};
	});
}

/** Enregistre les rangs déclarés pour une année. */
export async function saveManualRanks(
	supabase: Client,
	year: number,
	ranks: Partial<Record<DocumentKind, number>>
): Promise<PostgrestError | null> {
	const rows = DOCUMENT_KINDS.filter((kind) => ranks[kind] !== undefined).map((kind) => ({
		kind,
		year,
		last_manual_rank: ranks[kind] ?? 0
	}));
	if (rows.length === 0) {
		return null;
	}
	const { error } = await offsets(supabase)
		.from('document_number_offsets')
		.upsert(rows, { onConflict: 'kind,year' });
	return error;
}
