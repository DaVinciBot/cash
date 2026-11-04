// Demandes d'excuse d'absence — lectures pour la page membre et la vue Secrétaire.
//
// Tout passe par `cash.absence_request_view`, en `security_invoker` : la RLS
// décide seule de ce que chacun voit (ses demandes, ou toutes pour le porteur de
// `absences.requests.review`). Les filtres ci-dessous trient, ils n'autorisent
// rien.

import { ABSENCE_STATUSES, type AbsenceStatus } from '#lib/absences.js';
import type { Database } from '@davincibot/database-types';
import type { SupabaseClient } from '@supabase/supabase-js';

type Client = SupabaseClient<Database>;

type ViewRow = Database['cash']['Views']['absence_request_view']['Row'];

/**
 * Demande telle que les pages l'affichent. Les colonnes d'une vue sortent
 * toutes nullables des types générés ; celles que la table déclare NOT NULL
 * sont rétablies ici, une fois, plutôt que gardées dans chaque gabarit.
 */
export interface AbsenceRequestRow {
	id: number;
	requesterId: string;
	requesterEmail: string;
	absenceDate: string;
	startTime: string;
	endTime: string;
	reason: string;
	status: AbsenceStatus;
	refusalReason: string | null;
	createdAt: string;
	resolvedAt: string | null;
	resolvedByUsername: string | null;
	proofUrl: string | null;
}

export interface ReviewFilters {
	/** `null` : tous les statuts. */
	status: AbsenceStatus | null;
	requesterId: string | null;
	from: string | null;
	to: string | null;
}

/** Durée de validité des liens vers les justificatifs, en secondes. */
const PROOF_URL_TTL = 600;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isoDate(value: string | null): string | null {
	if (!value || !DATE_PATTERN.test(value)) {
		return null;
	}
	const parsed = new Date(`${value}T00:00:00Z`);
	return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value) ? value : null;
}

/**
 * Filtres lus de l'URL. Sans statut, la vue s'ouvre sur ce qui reste à
 * traiter ; `status=all` lève le filtre. Toute valeur illisible retombe sur le
 * défaut plutôt que d'atteindre la requête.
 */
export function parseReviewFilters(params: URLSearchParams): ReviewFilters {
	const rawStatus = params.get('status');
	const status =
		rawStatus === 'all'
			? null
			: (ABSENCE_STATUSES as readonly string[]).includes(rawStatus ?? '')
				? (rawStatus as AbsenceStatus)
				: 'pending';
	const requester = params.get('requester');

	return {
		status,
		requesterId: requester && UUID_PATTERN.test(requester) ? requester : null,
		from: isoDate(params.get('from')),
		to: isoDate(params.get('to'))
	};
}

/**
 * Le lecteur peut-il traiter les demandes ? Posé à la base plutôt que lu dans
 * `locals.permissions` : celles-ci ne sont remplies que par le load du layout,
 * qui ne tourne pas pour une action de formulaire. Une erreur vaut refus.
 */
export async function isReviewer(supabase: Client): Promise<boolean> {
	const { data, error } = await supabase.rpc('has_permission', {
		p_permission: 'absences.requests.review'
	});
	return !error && data;
}

/** Ajoute à chaque demande un lien signé vers son justificatif, en un appel. */
async function withProofUrls(supabase: Client, rows: ViewRow[]): Promise<AbsenceRequestRow[]> {
	const paths = rows.map((row) => row.proof_path).filter((path): path is string => !!path);
	const signed = new Map<string, string>();
	if (paths.length > 0) {
		const { data } = await supabase.storage
			.from('absence-proofs')
			.createSignedUrls(paths, PROOF_URL_TTL);
		for (const entry of data ?? []) {
			if (entry.path && entry.signedUrl) {
				signed.set(entry.path, entry.signedUrl);
			}
		}
	}
	return rows.map((row) => ({
		id: row.id ?? 0,
		requesterId: row.requester_id ?? '',
		requesterEmail: row.requester_email ?? '',
		absenceDate: row.absence_date ?? '',
		startTime: row.start_time ?? '',
		endTime: row.end_time ?? '',
		reason: row.reason ?? '',
		status: row.status ?? 'pending',
		refusalReason: row.refusal_reason,
		createdAt: row.created_at ?? '',
		resolvedAt: row.resolved_at,
		resolvedByUsername: row.resolved_by_username,
		proofUrl: row.proof_path ? (signed.get(row.proof_path) ?? null) : null
	}));
}

/** Les demandes du membre, la plus récente absence d'abord. */
export async function myRequests(supabase: Client, userId: string): Promise<AbsenceRequestRow[]> {
	const { data, error } = await supabase
		.schema('cash')
		.from('absence_request_view')
		.select('*')
		.eq('requester_id', userId)
		.order('absence_date', { ascending: false })
		.order('start_time', { ascending: false });
	if (error) {
		throw new Error(`Lecture des demandes d'excuse : ${error.message}`);
	}
	return withProofUrls(supabase, data);
}

/** La file du Secrétaire, dans l'ordre chronologique des absences. */
export async function reviewRequests(
	supabase: Client,
	filters: ReviewFilters
): Promise<AbsenceRequestRow[]> {
	let query = supabase.schema('cash').from('absence_request_view').select('*');
	if (filters.status) {
		query = query.eq('status', filters.status);
	}
	if (filters.requesterId) {
		query = query.eq('requester_id', filters.requesterId);
	}
	if (filters.from) {
		query = query.gte('absence_date', filters.from);
	}
	if (filters.to) {
		query = query.lte('absence_date', filters.to);
	}
	const { data, error } = await query
		.order('absence_date', { ascending: true })
		.order('start_time', { ascending: true });
	if (error) {
		throw new Error(`Lecture des demandes d'excuse : ${error.message}`);
	}
	return withProofUrls(supabase, data);
}

/**
 * Membres ayant au moins une demande, pour le filtre par membre. Lu sans les
 * autres filtres : choisir un membre ne doit pas faire disparaître les autres
 * de la liste.
 */
export async function requesters(supabase: Client): Promise<{ id: string; email: string }[]> {
	const { data, error } = await supabase
		.schema('cash')
		.from('absence_request')
		.select('requester_id, requester_email');
	if (error) {
		throw new Error(`Lecture des demandeurs : ${error.message}`);
	}
	const byId = new Map<string, string>();
	for (const row of data) {
		byId.set(row.requester_id, row.requester_email);
	}
	return [...byId]
		.map(([id, email]) => ({ id, email }))
		.sort((a, b) => a.email.localeCompare(b.email));
}
