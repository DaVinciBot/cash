// Tables de l'écran d'audit. Elles lisent les journaux depuis le navigateur : la
// RLS (`audit.logs.read`) décide seule de ce qui est visible, les filtres ne font
// que trier.

import {
	ACTION_LABELS,
	CASH_ENTITY_LABELS,
	FORMATION_ENTITY_LABELS,
	NOTIFICATION_CHANNEL_LABELS,
	NOTIFICATION_ENTITY_LABELS,
	NOTIFICATION_STATUSES,
	NOTIFICATION_TARGET_LABELS,
	NOTIFICATION_TEMPLATE_LABELS,
	SOCLE_ENTITY_LABELS,
	type ActivityEntry,
	type ActivityKind,
	type JournalChange
} from '#lib/types/audit.js';
import { CASH_ERROR_MESSAGES } from '#lib/types/domain.js';
import type { DBInfo, Filter } from '@davincibot/components';
import type { Json } from '@davincibot/database-types';
import { getSupabaseBrowserClient } from '@davincibot/lib/supabase';

export type AuditTab = 'socle' | 'cash' | 'formation' | 'rejets' | 'notifications';

const CHANGES = 'field,old_value,new_value';

export const AUDIT_DB: Record<AuditTab, DBInfo> = {
	socle: {
		table: 'socle_activities',
		key: `id,entity_type,entity_id,kind,actor_id,occurred_at,profiles(username),socle_activity_changes(${CHANGES})`,
		ordering: 'occurred_at:desc'
	},
	// `actor_id` pointe vers un autre schéma : PostgREST n'embarque pas au travers,
	// les noms se résolvent donc à part, dans `parseCashActivities`.
	cash: {
		schema: 'cash',
		table: 'cash_activities',
		key: `id,entity_type,entity_id,kind,actor_id,occurred_at,cash_activity_changes(${CHANGES})`,
		ordering: 'occurred_at:desc'
	},
	formation: {
		schema: 'formation',
		table: 'formation_activities',
		key: `id,entity_type,entity_id,kind,actor_id,occurred_at,formation_activity_changes(${CHANGES})`,
		ordering: 'occurred_at:desc'
	},
	rejets: {
		table: 'error_events',
		key: 'id,sqlstate,message,entity_type,entity_id,actor_id,occurred_at,profiles(username)',
		ordering: 'occurred_at:desc'
	},
	notifications: {
		table: 'notification_log',
		key: 'id,channel,template,entity_type,entity_id,recipient_id,target,status,error,created_at,profiles(username)',
		ordering: 'created_at:desc'
	}
};

/** Colonne sur laquelle porte la recherche de chaque table. */
export const AUDIT_SEARCH: Record<AuditTab, string> = {
	socle: 'entity_id',
	cash: 'entity_id',
	formation: 'entity_id',
	rejets: 'message',
	notifications: 'entity_id'
};

const entityOptions = (labels: Record<string, string>) =>
	Object.entries(labels).map(([value, name]) => ({ value, name }));

const actionOptions = (kinds: ActivityKind[]) =>
	kinds.map((kind) => ({ value: kind, name: ACTION_LABELS[kind] }));

// L'enum du socle n'a pas de `state_changed` : il n'y a pas d'état à changer sur
// un rôle ou un rattachement, seulement une révocation.
const SOCLE_ACTIONS: ActivityKind[] = ['created', 'updated', 'deleted'];
const ACTIONS: ActivityKind[] = ['created', 'updated', 'state_changed', 'deleted'];

export const AUDIT_FILTERS: Record<AuditTab, Filter[]> = {
	socle: [
		{ category: 'Action', value: 'kind', options: actionOptions(SOCLE_ACTIONS) },
		{ category: 'Entité', value: 'entity_type', options: entityOptions(SOCLE_ENTITY_LABELS) }
	],
	cash: [
		{ category: 'Action', value: 'kind', options: actionOptions(ACTIONS) },
		{ category: 'Entité', value: 'entity_type', options: entityOptions(CASH_ENTITY_LABELS) }
	],
	formation: [
		{ category: 'Action', value: 'kind', options: actionOptions(ACTIONS) },
		{ category: 'Entité', value: 'entity_type', options: entityOptions(FORMATION_ENTITY_LABELS) }
	],
	rejets: [
		{
			category: 'Code',
			value: 'sqlstate',
			options: Object.keys(CASH_ERROR_MESSAGES).map((code) => ({ value: code, name: code }))
		}
	],
	notifications: [
		{
			category: 'Statut',
			value: 'status',
			options: Object.entries(NOTIFICATION_STATUSES).map(([value, { label }]) => ({
				value,
				name: label
			}))
		},
		{ category: 'Canal', value: 'channel', options: entityOptions(NOTIFICATION_CHANNEL_LABELS) },
		{
			category: 'Gabarit',
			value: 'template',
			options: entityOptions(NOTIFICATION_TEMPLATE_LABELS)
		},
		{
			category: 'Entité',
			value: 'entity_type',
			options: entityOptions(NOTIFICATION_ENTITY_LABELS)
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
	formation_activity_changes?: ChangeRow[];
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

/**
 * Activités des journaux `cash` et `formation`. `actor_id` y pointe vers un autre
 * schéma : PostgREST n'embarque pas au travers, les noms se résolvent à part.
 */
async function parseActivities(
	rows: unknown[],
	labels: Record<string, string>,
	changesOf: (row: ActivityDbRow) => ChangeRow[] | undefined
): Promise<ActivityRow[]> {
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
			changes: toChanges(changesOf(row)),
			entity: labels[row.entity_type] ?? row.entity_type,
			entityId: String(row.entity_id)
		};
		return value;
	});
}

export const parseCashActivities = (rows: unknown[]) =>
	parseActivities(rows, CASH_ENTITY_LABELS, (row) => row.cash_activity_changes);

export const parseFormationActivities = (rows: unknown[]) =>
	parseActivities(rows, FORMATION_ENTITY_LABELS, (row) => row.formation_activity_changes);

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

export interface NotificationRow {
	channel: string;
	template: string;
	entity: string;
	entityId: string;
	recipient: string;
	status: string;
	error: string | null;
	createdAt: string;
}

interface NotificationDbRow {
	channel: string;
	template: string;
	entity_type: string;
	entity_id: string;
	recipient_id: string | null;
	target: string | null;
	status: string;
	error: string | null;
	created_at: string;
	profiles: { username: string | null } | null;
}

// Un membre se nomme par son profil ; une diffusion n'a pas de profil et garde
// l'adresse effective de l'émission, ou le rôle qu'elle visait.
function recipientLabel(row: NotificationDbRow): string {
	if (row.recipient_id) {
		return row.profiles?.username ?? 'Compte supprimé';
	}
	if (row.target) {
		return NOTIFICATION_TARGET_LABELS[row.target] ?? row.target;
	}
	return '—';
}

export const parseNotifications = (rows: unknown[]): NotificationRow[] =>
	(rows as NotificationDbRow[]).map((row) => {
		const value: NotificationRow = {
			channel: NOTIFICATION_CHANNEL_LABELS[row.channel] ?? row.channel,
			template: NOTIFICATION_TEMPLATE_LABELS[row.template] ?? row.template,
			entity: NOTIFICATION_ENTITY_LABELS[row.entity_type] ?? row.entity_type,
			entityId: row.entity_id,
			recipient: recipientLabel(row),
			status: row.status,
			error: row.error,
			createdAt: row.created_at
		};
		return value;
	});
