// Référentiel de lecture des journaux (jalon 8).
//
// Les trois journaux stockent des noms de colonnes et des valeurs JSON brutes :
// c'est ce qu'un trigger générique peut écrire sans connaître le métier. Traduire
// « refused_reason » en « Motif du refus » est donc un travail d'affichage, et il
// se fait ICI plutôt que dans chaque écran — un même champ doit se lire pareil
// sur le détail d'un item et dans l'écran d'audit.
//
// Ce qui n'a pas de libellé s'affiche sous son nom de colonne. C'est laid, et
// c'est voulu : une colonne ajoutée sans passer par ce fichier reste lisible, et
// son absence se voit.

import { type Json } from '@davincibot/database-types';

/** Enums cash.cash_activity_kind et formation.formation_activity_kind. */
export const ACTIVITY_KINDS = ['created', 'updated', 'state_changed', 'deleted'] as const;

export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

/** Enum public.socle_activity_kind — le socle n'a pas d'état à changer. */
export const SOCLE_ACTIVITY_KINDS = ['created', 'updated', 'deleted'] as const;

export type SocleActivityKind = (typeof SOCLE_ACTIVITY_KINDS)[number];

interface ActivityBadge {
	label: string;
	emoji: string;
	className: string;
}

/**
 * Repères visuels des quatre natures d'événement.
 *
 * `state_changed` se distingue d'`updated` parce que c'est la seule qui raconte
 * une décision : un item refusé, une commande passée. Les noyer dans « modifié »
 * rendrait la ligne de temps illisible là où elle est justement le plus utile
 * (CMD-F-61).
 */
export const ACTIVITY_BADGES: Record<ActivityKind, ActivityBadge> = {
	created: {
		label: 'Création',
		emoji: '✨',
		className: 'bg-green-500/15 text-green-300 ring-1 ring-green-500/30'
	},
	updated: {
		label: 'Modification',
		emoji: '✏️',
		className: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30'
	},
	state_changed: {
		label: "Changement d'état",
		emoji: '🔁',
		className: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
	},
	deleted: {
		label: 'Suppression',
		emoji: '🗑️',
		className: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30'
	}
};

/** Types d'entité journalisés dans `cash.cash_activities` (§9 du schéma). */
export const CASH_ENTITY_LABELS: Record<string, string> = {
	item: 'Item',
	order: 'Commande',
	flow: 'Flux',
	budget: 'Budget',
	bank_account: 'Compte',
	partnership: 'Partenariat',
	school_year: 'Année scolaire',
	fiscal_year: 'Exercice',
	flow_proof: 'Justificatif',
	item_attachment: 'Pièce jointe',
	generated_document: 'Document'
};

/** Types d'entité journalisés dans `public.socle_activities` (TRANS-NF-51). */
export const SOCLE_ENTITY_LABELS: Record<string, string> = {
	profiles: 'Profil',
	member_of: 'Rattachement projet',
	profile_global_roles: 'Rôle global',
	global_roles: 'Catalogue de rôle',
	project_role_permissions: 'Catalogue de rôle projet',
	blog: 'Article de blog'
};

/**
 * Noms lisibles des colonnes journalisées.
 *
 * Un seul dictionnaire pour toutes les entités : deux colonnes qui portent le
 * même nom veulent dire la même chose dans ce schéma (`state`, `amount_ttc`,
 * `archived_at`), et les distinguer par entité multiplierait les entrées sans
 * rien clarifier.
 */
const FIELD_LABELS: Record<string, string> = {
	// Item
	name: 'Nom',
	link: 'Lien',
	domain: 'Marchand',
	unit_price_ttc: 'Prix unitaire TTC',
	quantity: 'Quantité',
	total_ttc: 'Total TTC',
	tags: 'Tags',
	note: 'Note',
	expected_delivery_on: 'Livraison estimée',
	state: 'État',
	campus: 'Campus',
	project_id: 'Projet',
	requested_by: 'Demandeur',
	order_id: 'Commande',
	school_year_id: 'Année scolaire',
	cdp_approved_at: 'Validation CDP',
	refused_reason: 'Motif du refus',
	received_at: 'Réception',
	created_at: 'Création',
	// Commande
	shipping_cost_ttc: 'Frais de port TTC',
	shipping_allocation: 'Répartition du port',
	amount_ttc: 'Montant TTC',
	ordered_at: 'Passation',
	delivered_at: 'Livraison',
	// Trésorerie
	direction: 'Sens',
	occurred_on: 'Date',
	label: 'Libellé',
	account_id: 'Compte',
	fiscal_year_id: 'Exercice',
	budget_id: 'Budget',
	origin: 'Origine',
	is_reconciled: 'Pointé',
	reverses_flow_id: 'Contrepasse le flux',
	opening_balance: "Solde d'ouverture",
	opened_on: 'Ouverture',
	archived_at: 'Archivage',
	closed_at: 'Clôture',
	parent_id: 'Budget parent',
	is_default: 'Feuille par défaut',
	domains: 'Domaines',
	notes: 'Notes',
	starts_on: 'Début',
	ends_on: 'Fin',
	number: 'Numéro',
	issued_on: 'Émission',
	recipient_name: 'Destinataire',
	recipient_address: 'Adresse du destinataire',
	subject: 'Objet',
	kind: 'Type',
	storage_path: 'Fichier',
	mime_type: 'Type de fichier',
	filename: 'Nom du fichier',
	// Socle
	username: "Nom d'usage",
	avatar_url: 'Avatar',
	permissions: 'Permissions',
	status: 'Statut',
	status_reason: 'Motif du statut',
	role: 'Rôle',
	revoked_at: 'Révocation',
	revoked_by: 'Révoqué par',
	rank: 'Rang',
	title: 'Titre',
	slug: 'Slug',
	content: 'Contenu',
	published_at: 'Publication'
};

/** Libellé d'un champ journalisé ; à défaut, son nom de colonne. */
export function fieldLabel(field: string): string {
	return FIELD_LABELS[field] ?? field;
}

/**
 * Champs dont la valeur brute n'apprend rien à un lecteur.
 *
 * Ce sont des identifiants : « projet 12 → projet 7 » ne dit rien que « Projet a
 * changé » ne dise déjà. Les résoudre en noms supposerait une jointure par
 * ligne de journal vers une table dont la ligne a pu disparaître depuis.
 */
const OPAQUE_FIELDS = new Set([
	'project_id',
	'requested_by',
	'order_id',
	'school_year_id',
	'fiscal_year_id',
	'account_id',
	'budget_id',
	'parent_id',
	'reverses_flow_id',
	'revoked_by',
	'storage_path',
	'avatar_url'
]);

export function isOpaqueField(field: string): boolean {
	return OPAQUE_FIELDS.has(field);
}

/**
 * Rend une valeur de journal affichable.
 *
 * Les valeurs viennent de `to_jsonb(row)` : un texte est une chaîne JSON, un
 * numeric aussi (PostgreSQL le sérialise en chaîne pour ne pas perdre de
 * précision), un tableau reste un tableau. `null` se dit « — » et non « null » :
 * l'absence de valeur est une information courante ici, pas un cas limite.
 */
export function formatJournalValue(value: Json): string {
	if (value === null) {
		return '—';
	}
	if (Array.isArray(value)) {
		return value.length === 0 ? '—' : value.map(formatJournalValue).join(', ');
	}
	if (typeof value === 'boolean') {
		return value ? 'oui' : 'non';
	}
	if (typeof value === 'object') {
		return JSON.stringify(value);
	}
	return String(value);
}

export interface JournalChange {
	field: string;
	old: Json;
	new: Json;
}

export interface ActivityEntry {
	id: number;
	kind: ActivityKind;
	actorId: string | null;
	actorName: string | null;
	occurredAt: string;
	changes: JournalChange[];
}

/**
 * Résumé d'une entrée, en une ligne (CMD-F-62).
 *
 * La ligne de temps est LINÉAIRE : une entrée, une phrase. Le détail — chaque
 * champ, avant et après — n'apparaît qu'au survol. Tout déplier d'emblée
 * transforme trois modifications de prix en un mur de texte, ce qui est
 * exactement ce que le format linéaire cherche à éviter.
 */
export function summarizeActivity(entry: ActivityEntry): string {
	if (entry.kind === 'created') {
		return 'Créé';
	}
	if (entry.kind === 'deleted') {
		return 'Supprimé';
	}
	const stateChange = entry.changes.find((c) => c.field === 'state');
	if (stateChange) {
		return `État : ${formatJournalValue(stateChange.old)} → ${formatJournalValue(stateChange.new)}`;
	}
	const [only] = entry.changes;
	if (!only) {
		return 'Modifié';
	}
	if (entry.changes.length === 1) {
		return `${fieldLabel(only.field)} modifié`;
	}
	return `${String(entry.changes.length)} champs modifiés`;
}

/** Auteur affichable d'une entrée : un trigger système n'a pas d'utilisateur. */
export function actorLabel(entry: Pick<ActivityEntry, 'actorId' | 'actorName'>): string {
	if (!entry.actorId) {
		return 'Système';
	}
	return entry.actorName ?? 'Compte supprimé';
}
