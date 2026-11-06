// Traçabilité et recherche (jalon 8).
//
// Trois journaux, trois portées, et c'est la portée qui décide du chemin d'accès :
//
//   - l'historique d'UNE ligne passe par `cash.entity_history`, qui vérifie que
//     l'appelant peut lire cette ligne-là. C'est ce qui met « modifié par X le
//     Y » sur le détail d'un item que son demandeur consulte (TRANS-NF-50), sans
//     pour autant lui ouvrir le journal de la trésorerie ;
//   - les trois journaux en entier se lisent directement, sous `audit.logs.read`
//     que les policies exigent. Rien à vérifier ici : la RLS rend zéro ligne à
//     qui n'a pas le droit, et un tableau vide est la bonne réponse ;
//   - les écritures rejetées s'ÉCRIVENT par RPC (TRANS-NF-52) : l'exception qui
//     porte le code annule la transaction, donc l'enregistrement vient d'après.

import { type ActivityEntry, type JournalChange } from '#lib/types/audit.js';
import { cashErrorMessage } from '#lib/types/domain.js';
import type { Database } from '@davincibot/database-types';
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

type Client = SupabaseClient<Database>;

/** Entités dont `cash.entity_history` accepte de rendre l'historique. */
export type HistoryEntity =
	| 'item'
	| 'order'
	| 'flow'
	| 'budget'
	| 'bank_account'
	| 'partnership'
	| 'school_year'
	| 'fiscal_year'
	| 'flow_proof'
	| 'generated_document';

/**
 * Historique d'une entité, du plus récent au plus ancien.
 *
 * Un refus renvoie une liste vide plutôt qu'une erreur : l'historique est un
 * complément d'écran, jamais son objet. Une commande consultable dont
 * l'historique casserait la page échangerait un manque contre une panne.
 */
export async function entityHistory(
	supabase: Client,
	entity: HistoryEntity,
	id: number
): Promise<ActivityEntry[]> {
	const { data, error } = await supabase.schema('cash').rpc('entity_history', {
		p_entity_type: entity,
		p_entity_id: id
	});

	if (error) {
		return [];
	}

	return data.map((row) => ({
		id: row.activity_id,
		kind: row.kind,
		actorId: row.actor_id,
		actorName: row.actor_name,
		occurredAt: row.occurred_at,
		changes: (row.changes as unknown as JournalChange[] | null) ?? []
	}));
}

/**
 * Enregistre une écriture refusée.
 *
 * Ne fait rien pour les erreurs qui ne disent rien du métier — une session
 * expirée, un réseau coupé. Le journal sert à voir ce que les RÈGLES ont refusé,
 * et le noyer sous les incidents techniques le rendrait illisible.
 *
 * Ne lève jamais : l'appelant est déjà en train de traiter un échec, et un
 * second échec pendant l'enregistrement du premier ne doit pas remplacer le
 * message que l'utilisateur attend.
 */
export async function logRejectedWrite(
	supabase: Client,
	error: Pick<PostgrestError, 'code' | 'message'> | null,
	target: { schema?: string; entityType?: string; entityId?: string | number; route?: string }
): Promise<void> {
	const code = error?.code;
	if (!code || !isBusinessRejection(code)) {
		return;
	}

	await supabase.rpc('log_rejected_write', {
		p_sqlstate: code,
		p_message: error.message,
		p_schema_name: target.schema ?? 'cash',
		p_entity_type: target.entityType,
		p_entity_id: target.entityId === undefined ? undefined : String(target.entityId),
		p_context: target.route ? { route: target.route } : undefined
	});
}

export interface RejectionTarget {
	schema?: string;
	entityType?: string;
	entityId?: string | number;
	route?: string;
}

/**
 * Traduit un refus ET l'enregistre, en un seul geste.
 *
 * Les deux vont ensemble : un refus qu'on montre à l'utilisateur sans le
 * journaliser est invisible pour qui cherche ensuite pourquoi les écritures de
 * juillet ont été bloquées. Les séparer laisserait la moitié des appels oublier
 * la seconde étape — c'est pourquoi une seule fonction fait les deux.
 *
 * S'utilise partout où `cashErrorMessage` était appelé directement :
 *
 *     return fail(400, { message: await rejection(locals.supabase, err, 'Défaut', {…}) });
 */
export async function rejection(
	supabase: Client,
	error: Pick<PostgrestError, 'code' | 'message'> | null,
	fallback: string,
	target: RejectionTarget = {}
): Promise<string> {
	await logRejectedWrite(supabase, error, target);
	return cashErrorMessage(error?.code, fallback);
}

/**
 * Codes qui traduisent un refus métier, par opposition à une panne.
 *
 * Les `DVBxx` sont les nôtres. Les quatre codes standards retenus sont ceux que
 * nos propres contraintes lèvent : violation de contrainte de contrôle,
 * unicité, permission, paramètre invalide. Un `08xxx` (connexion) ou un `57xxx`
 * (arrêt du serveur) n'a rien à faire dans un journal métier.
 */
function isBusinessRejection(code: string): boolean {
	return code.startsWith('DVB') || ['23514', '23505', '23503', '42501', '22023'].includes(code);
}

export interface SearchHit {
	id: number;
	name: string;
	link: string | null;
	state: string;
	totalTtc: number;
	quantity: number;
	campus: string;
	projectId: number;
	requestedBy: string;
	orderId: number | null;
	createdAt: string;
}

/**
 * Recherche plein texte des items (CMD-F-70).
 *
 * La RPC est `SECURITY INVOKER` : ce qui remonte est exactement ce que la liste
 * montrerait. Un membre retrouve ses items et ceux des projets qu'il suit, le
 * trésorier retrouve tout — sans qu'aucun filtre soit écrit ici.
 */
export async function searchItems(
	supabase: Client,
	query: string,
	limit = 50
): Promise<SearchHit[]> {
	const trimmed = query.trim();
	if (trimmed.length === 0) {
		return [];
	}

	const { data, error } = await supabase
		.schema('cash')
		.rpc('search_items', { p_query: trimmed, p_limit: limit });

	if (error) {
		return [];
	}

	return data.map((row) => ({
		id: row.id,
		name: row.name,
		link: row.link,
		state: row.state,
		totalTtc: row.total_ttc,
		quantity: row.quantity,
		campus: row.campus,
		projectId: row.project_id,
		requestedBy: row.requested_by,
		orderId: row.order_id,
		createdAt: row.created_at
	}));
}

/**
 * Commandes atteintes par une recherche, via leurs items.
 *
 * Une commande n'a aucun champ textuel propre : pas de titre, pas de référence
 * saisie. La chercher, c'est chercher ses items puis remonter — d'où cette
 * fonction plutôt qu'une seconde recherche sur `orders`, qui n'aurait rien à
 * indexer.
 */
export function orderIdsFrom(hits: SearchHit[]): number[] {
	const ids = new Set<number>();
	for (const hit of hits) {
		if (hit.orderId !== null) {
			ids.add(hit.orderId);
		}
	}
	return [...ids];
}
