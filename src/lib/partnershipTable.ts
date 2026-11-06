// Tables des partenariats (TRESO-F-10/11/12), en cours et archivés. Elles lisent
// `cash.partnerships` par deux vues, depuis le navigateur : la RLS décide seule de
// ce que chacun voit. L'année et l'enveloppe (nom, solde) sont lues par page.

import type { DBInfo } from '@davincibot/components';
import { getSupabaseBrowserClient } from '@davincibot/lib/supabase';

const PARTNERSHIP_KEY = 'id,name,school_year_id,domains,account_id,notes,archived_at';

export const ACTIVE_PARTNERSHIPS_DB: DBInfo = {
	schema: 'cash',
	table: 'active_partnerships',
	key: PARTNERSHIP_KEY,
	ordering: 'name:asc'
};

export const ARCHIVED_PARTNERSHIPS_DB: DBInfo = {
	schema: 'cash',
	table: 'archived_partnerships',
	key: PARTNERSHIP_KEY,
	ordering: 'name:asc'
};

interface PartnershipDbRow {
	id: number;
	name: string;
	school_year_id: number;
	domains: string[];
	account_id: number | null;
	notes: string | null;
	archived_at: string | null;
}

export interface PartnershipRow {
	id: number;
	name: string;
	schoolYearLabel: string;
	domains: string[];
	accountName: string | null;
	accountBalance: number | null;
	notes: string | null;
	archivedAt: string | null;
}

/** Met en forme les partenariats d'une page, avec leur année et le solde de leur enveloppe. */
export async function parsePartnershipRows(rows: unknown[]): Promise<PartnershipRow[]> {
	const list = rows as PartnershipDbRow[];
	if (list.length === 0) {
		return [];
	}

	const cash = getSupabaseBrowserClient().schema('cash');
	const accountIds = list.flatMap((row) => (row.account_id === null ? [] : [row.account_id]));
	const [{ data: years }, { data: accounts }, { data: balances }] = await Promise.all([
		cash.from('school_years').select('id, label'),
		cash.from('bank_accounts').select('id, name').in('id', accountIds),
		cash.from('account_balances').select('account_id, balance').in('account_id', accountIds)
	]);

	const yearLabels = new Map((years ?? []).map((year) => [year.id, year.label]));
	const accountNames = new Map((accounts ?? []).map((account) => [account.id, account.name]));
	const accountBalances = new Map(
		(balances ?? []).flatMap((entry) =>
			entry.account_id === null ? [] : [[entry.account_id, entry.balance] as const]
		)
	);

	return list.map((row) => ({
		id: row.id,
		name: row.name,
		schoolYearLabel: yearLabels.get(row.school_year_id) ?? '—',
		domains: row.domains,
		accountName: row.account_id === null ? null : (accountNames.get(row.account_id) ?? null),
		accountBalance: row.account_id === null ? null : (accountBalances.get(row.account_id) ?? null),
		notes: row.notes,
		archivedAt: row.archived_at
	}));
}
