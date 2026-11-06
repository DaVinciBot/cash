// Tables de l'écran d'audit. Elles lisent les journaux depuis le navigateur : la
// RLS (`audit.logs.read`) décide seule de ce qui est visible, les filtres ne font
// que trier.

import {
	CASH_ENTITY_LABELS,
	SOCLE_ENTITY_LABELS,
	type ActivityEntry,
	type JournalChange
} from '#lib/types/audit.js';
import { CASH_ERROR_MESSAGES } from '#lib/types/domain.js';
import type { DBInfo, Filter } from '@davincibot/components';
import type { Json } from '@davincibot/database-types';
import { getSupabaseBrowserClient } from '@davincibot/lib/supabase';

export type AuditTab = 'socle' | 'metier' | 'rejets';

const CHANGES = 'field,old_value,new_value';

export const AUDIT_DB: Record<AuditTab, DBInfo> = {
	socle: {
		table: 'socle_activities',
		key: `id,entity_type,entity_id,kind,actor_id,occurred_at,profiles(username),socle_activity_changes(${CHANGES})`,
		ordering: 'occurred_at:desc'
	},
	// `actor_id` pointe vers un autre schéma : PostgREST n'embarque pas au travers,
	// les noms se résolvent donc à part, dans `parseCashActivities`.
	metier: {
		schema: 'cash',
		table: 'cash_activities',
		key: `id,entity_type,entity_id,kind,actor_id,occurred_at,cash_activity_changes(${CHANGES})`,
		ordering: 'occurred_at:desc'
	},
	rejets: {
		table: 'error_events',
		key: 'id,sqlstate,message,entity_type,entity_id,actor_id,occurred_at,profiles(username)',
		ordering: 'occurred_at:desc'
	}
};

/** Colonne sur laquelle porte la recherche de chaque table. */
export const AUDIT_SEARCH: Record<AuditTab, string> = {
	socle: 'entity_type',
	metier: 'entity_type',
	rejets: 'message'
};

const entityOptions = (labels: Record<string, string>) =>
	Object.entries(labels).map(([value, name]) => ({ value, name }));

export const AUDIT_FILTERS: Record<AuditTab, Filter[]> = {
	socle: [
		{ category: 'Entité', value: 'entity_type', options: entityOptions(SOCLE_ENTITY_LABELS) }
	],
	metier: [
		{ category: 'Entité', value: 'entity_type', options: entityOptions(CASH_ENTITY_LABELS) }
	],
	rejets: [
		{
			category: 'Code',
			value: 'sqlstate',
			options: Object.keys(CASH_ERROR_MESSAGES).map((code) => ({ value: code, name: code }))
		}
	]
};

/** Une activité telle que les cellules l'affichent. */
export interface ActivityRow extends ActivityEntry {
	entity: string;
	entityId: string;
}

export interface RejectedRow {
	sqlstate: string;
	message: string;
	entity: string | null;
	entityId: string | null;
	actor: string;
	occurredAt: string;
}

interface ChangeRow {
	field: string;
	old_value: Json;
	new_value: Json;
}

interface ActivityDbRow {
	id: number;
	entity_type: string;
	entity_id: string | number;
	kind: ActivityEntry['kind'];
	actor_id?: string | null;
	occurred_at: string;
	profiles?: { username: string | null } | null;
	socle_activity_changes?: ChangeRow[];
	cash_activity_changes?: ChangeRow[];
}

const toChanges = (rows: ChangeRow[] | undefined): JournalChange[] =>
	(rows ?? []).map((row) => ({ field: row.field, old: row.old_value, new: row.new_value }));

export const parseSocleActivities = (rows: unknown[]): ActivityRow[] =>
	(rows as ActivityDbRow[]).map((row) => {
		const value: ActivityRow = {
			id: row.id,
			kind: row.kind,
			actorId: row.actor_id ?? null,
			actorName: row.profiles?.username ?? null,
			occurredAt: row.occurred_at,
			changes: toChanges(row.socle_activity_changes),
			entity: SOCLE_ENTITY_LABELS[row.entity_type] ?? row.entity_type,
			entityId: String(row.entity_id)
		};
		return value;
	});

export async function parseCashActivities(rows: unknown[]): Promise<ActivityRow[]> {
	const list = rows as ActivityDbRow[];
	const ids = [...new Set(list.map((row) => row.actor_id).filter((id): id is string => !!id))];
	const names = new Map<string, string | null>();
	if (ids.length > 0) {
		const { data } = await getSupabaseBrowserClient()
			.from('profiles')
			.select('id, username')
			.in('id', ids);
		for (const profile of data ?? []) {
			names.set(profile.id, profile.username);
		}
	}
	return list.map((row) => {
		const value: ActivityRow = {
			id: row.id,
			kind: row.kind,
			actorId: row.actor_id ?? null,
			actorName: row.actor_id ? (names.get(row.actor_id) ?? null) : null,
			occurredAt: row.occurred_at,
			changes: toChanges(row.cash_activity_changes),
			entity: CASH_ENTITY_LABELS[row.entity_type] ?? row.entity_type,
			entityId: String(row.entity_id)
		};
		return value;
	});
}

interface RejectedDbRow {
	sqlstate: string;
	message: string;
	entity_type: string | null;
	entity_id: string | null;
	actor_id: string | null;
	occurred_at: string;
	profiles: { username: string | null } | null;
}

export const parseRejected = (rows: unknown[]): RejectedRow[] =>
	(rows as RejectedDbRow[]).map((row) => {
		const value: RejectedRow = {
			sqlstate: row.sqlstate,
			message: row.message,
			entity: row.entity_type ? (CASH_ENTITY_LABELS[row.entity_type] ?? row.entity_type) : null,
			entityId: row.entity_id,
			actor: row.profiles?.username ?? (row.actor_id ? 'Compte supprimé' : 'Système'),
			occurredAt: row.occurred_at
		};
		return value;
	});
