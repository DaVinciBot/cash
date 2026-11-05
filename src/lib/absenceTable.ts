// Table des demandes d'excuse, partagée par la page membre et la vue Secrétaire.
// Elle lit `cash.absence_request_view` depuis le navigateur : la RLS décide seule
// de ce que chacun voit, les filtres ci-dessous ne font que trier.

import { ABSENCE_STATUS_LABELS, ABSENCE_STATUSES, type AbsenceStatus } from '#lib/absences.js';
import type { DBInfo, Filter } from '@davincibot/components';
import { getSupabaseBrowserClient } from '@davincibot/lib/supabase';

export const ABSENCE_TABLE_DB: DBInfo = {
	schema: 'cash',
	table: 'absence_request_view',
	key: 'id,requester_id,requester_email,absence_date,start_time,end_time,reason,status,refusal_reason,proof_path,created_at,resolved_at,resolved_by_username',
	ordering: 'absence_date:desc'
};

/**
 * Statut et plage de dates. Le statut s'ouvre sur « En attente » : ce qui reste
 * à traiter. `scope` ajoute un filtre caché (clause WHERE) au filtre visible.
 */
export function absenceFilters(scope?: { requesterId: string }): Filter[] {
	const filters: Filter[] = [
		{
			category: 'Statut',
			value: 'status',
			options: ABSENCE_STATUSES.map((status) => ({
				value: status,
				name: ABSENCE_STATUS_LABELS[status],
				active: status === 'pending'
			}))
		},
		{ category: 'Date', value: 'absence_date', operator: 'range', options: [] }
	];
	if (scope) {
		filters.push({
			category: 'hidden',
			value: 'requester_id',
			options: [{ name: 'Moi', value: scope.requesterId, active: true }]
		});
	}
	return filters;
}

interface ViewRow {
	id: number;
	requester_email: string;
	absence_date: string;
	start_time: string;
	end_time: string;
	reason: string;
	status: AbsenceStatus;
	refusal_reason: string | null;
	proof_path: string | null;
	created_at: string;
	resolved_at: string | null;
	resolved_by_username: string | null;
}

/** Demande telle que les cellules l'affichent. */
export interface AbsenceRow {
	id: number;
	email: string;
	date: string;
	startTime: string;
	endTime: string;
	reason: string;
	status: AbsenceStatus;
	refusalReason: string | null;
	proofUrl: string | null;
	createdAt: string;
	resolvedAt: string | null;
	resolvedBy: string | null;
}

/** Durée de validité des liens vers les justificatifs, en secondes. */
const PROOF_URL_TTL = 600;

/** `HH:MM:SS` renvoyé par Postgres → `HH:MM`. */
export const hm = (time: string) => time.slice(0, 5);

/** Met en forme les lignes de la vue, avec un lien signé vers chaque justificatif, en un appel. */
export async function parseAbsenceRows(rows: unknown[]): Promise<AbsenceRow[]> {
	const list = rows as ViewRow[];
	const paths = list.map((row) => row.proof_path).filter((path): path is string => !!path);
	const signed: Record<string, string> = {};
	if (paths.length > 0) {
		const { data } = await getSupabaseBrowserClient()
			.storage.from('absence-proofs')
			.createSignedUrls(paths, PROOF_URL_TTL);
		for (const entry of data ?? []) {
			if (entry.path && entry.signedUrl) {
				signed[entry.path] = entry.signedUrl;
			}
		}
	}
	return list.map((row) => ({
		id: row.id,
		email: row.requester_email,
		date: row.absence_date,
		startTime: row.start_time,
		endTime: row.end_time,
		reason: row.reason,
		status: row.status,
		refusalReason: row.refusal_reason,
		proofUrl: row.proof_path ? (signed[row.proof_path] ?? null) : null,
		createdAt: row.created_at,
		resolvedAt: row.resolved_at,
		resolvedBy: row.resolved_by_username
	}));
}
