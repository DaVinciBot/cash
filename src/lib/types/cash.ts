// Référentiel unique des états et des repères visuels du domaine commande.
//
// CMD-F-20 impose un ensemble d'états FERMÉ et UNIQUE, identique dans les tables,
// les filtres et l'affichage détail ; TRANS-NF-40 impose des repères visuels
// cohérents dans toute l'application. Les deux exigences se tiennent par ce
// fichier : toute couleur, tout libellé et tout emoji d'état s'y lisent, et
// nulle part ailleurs. Un écran qui invente son propre libellé reproduit le
// défaut n° 10 (statuts incohérents entre tables, filtres et affichage).
//
// Les listes reflètent exactement les enums cash.item_state, cash.order_state et
// public.campus. Elles ne se dérivent pas des types générés : `as const` donne
// l'ordre d'affichage, que le catalogue Postgres ne garantit pas.

import type { StateBadge } from '@davincibot/lib';

/** Enum cash.item_state, dans l'ordre du cycle de vie (§7.1). */
export const ITEM_STATES = [
	'pending_cdp',
	'pending_bundled',
	'bundled',
	'received',
	'refused_cdp',
	'refused_treso'
] as const;

export type ItemState = (typeof ITEM_STATES)[number];

/** Enum cash.order_state (§7.1). */
export const ORDER_STATES = ['pending_treso', 'pending_delivery', 'completed', 'canceled'] as const;

export type OrderState = (typeof ORDER_STATES)[number];

/** Enum cash.item_tag. */
export const ITEM_TAGS = ['méca', 'info', 'élek'] as const;

export type ItemTag = (typeof ITEM_TAGS)[number];

/** Enum cash.shipping_allocation — mode de répartition des frais de port (§7.2). */
export const SHIPPING_ALLOCATIONS = ['proportional', 'equal'] as const;

export type ShippingAllocation = (typeof SHIPPING_ALLOCATIONS)[number];

/**
 * Libellés des deux modes de répartition.
 *
 * Le proportionnel est le défaut : plus juste dès que les volumes diffèrent. Le
 * mode égal reste offert parce qu'il se défend quand la commande porte sur des
 * pièces de poids comparable et que le port tient au colis, pas au contenu.
 */
export const SHIPPING_ALLOCATION_LABELS: Record<ShippingAllocation, string> = {
	proportional: 'Proportionnelle au montant de chaque budget',
	equal: 'Égale entre les budgets concernés'
};

/** Enum cash.flow_direction — sens d'un mouvement de trésorerie (§6.3). */
export const FLOW_DIRECTIONS = ['debit', 'credit'] as const;

export type FlowDirection = (typeof FLOW_DIRECTIONS)[number];

export const FLOW_DIRECTION_BADGES: Record<FlowDirection, StateBadge> = {
	debit: {
		label: 'Débit',
		emoji: '↘',
		className: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30'
	},
	credit: {
		label: 'Crédit',
		emoji: '↗',
		className: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
	}
};

/** Enum cash.flow_origin — le flux naît du passage d'une commande, ou d'une saisie. */
export const FLOW_ORIGINS = ['auto', 'manual'] as const;

export type FlowOrigin = (typeof FLOW_ORIGINS)[number];

/** Enum cash.bank_account_kind. */
export const ACCOUNT_KINDS = ['current', 'savings', 'partner_credit'] as const;

export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
	current: 'Compte courant',
	savings: 'Livret / épargne',
	partner_credit: 'Enveloppe partenaire'
};

/**
 * Les enveloppes de partenariat n'entrent jamais dans le solde de trésorerie
 * (TRESO-F-15).
 *
 * Ce sont des avoirs chez un tiers, pas de l'argent en banque : les additionner
 * au solde ferait croire à une capacité de paiement qui n'existe pas.
 */
export function countsTowardTreasury(kind: AccountKind): boolean {
	return kind !== 'partner_credit';
}

/** Un flux issu d'une commande n'est pas saisi à la main — il se corrige, il ne se crée pas. */
export function isFlowGenerated(origin: FlowOrigin): boolean {
	return origin === 'auto';
}

/** Enum cash.document_kind — les quatre documents générés (TRESO-F-40 à 43). */
export const DOCUMENT_KINDS = ['expense_report', 'quote', 'invoice', 'tax_receipt'] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
	expense_report: 'Note de frais',
	quote: 'Devis',
	invoice: 'Facture',
	tax_receipt: 'Reçu fiscal'
};

/**
 * Préfixe de la série de numérotation, identique à celui que produit
 * `cash.next_document_number`.
 *
 * Dupliqué côté client pour l'affichage seulement : le numéro est TOUJOURS
 * attribué par la base, sous verrou. Le calculer ici en ferait deux sources.
 */
export const DOCUMENT_KIND_PREFIXES: Record<DocumentKind, string> = {
	expense_report: 'NDF',
	quote: 'DEV',
	invoice: 'FAC',
	tax_receipt: 'REC'
};

/**
 * Un document dont le montant se lit sur un flux existant, plutôt que saisi.
 *
 * Une facture et un reçu matérialisent un mouvement déjà enregistré ; un devis
 * le précède, et une note de frais le demande.
 */
export function documentFollowsFlow(kind: DocumentKind): boolean {
	return kind === 'invoice' || kind === 'tax_receipt';
}

// TODO: émoji -> lucide icon

/**
 * Repères visuels des états d'item.
 *
 * Les deux refus sont volontairement DISTINCTS à l'œil (§5.3) : un refus CDP se
 * rediscute avec son chef de projet, un refus trésorier avec la trésorerie. Les
 * confondre obligerait le membre à ouvrir le détail pour savoir à qui parler.
 */
export const ITEM_STATE_BADGES: Record<ItemState, StateBadge> = {
	pending_cdp: {
		label: 'En revue par le CDP',
		emoji: '🕓',
		className: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
	},
	pending_bundled: {
		label: 'Validé',
		emoji: '✅',
		className: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30'
	},
	bundled: {
		label: 'Regroupé',
		emoji: '📦',
		className: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30'
	},
	received: {
		label: 'Reçu',
		emoji: '🎉',
		className: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
	},
	refused_cdp: {
		label: 'Refusé par le CDP',
		emoji: '🚫',
		className: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30'
	},
	refused_treso: {
		label: 'Refusé par le trésorier',
		emoji: '💸',
		className: 'bg-orange-600/15 text-orange-300 ring-1 ring-orange-600/30'
	}
};

// TODO: émoji -> lucide icon

export const ORDER_STATE_BADGES: Record<OrderState, StateBadge> = {
	pending_treso: {
		label: 'En attente du trésorier',
		emoji: '🕓',
		className: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
	},
	pending_delivery: {
		label: 'En attente de livraison',
		emoji: '🚚',
		className: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30'
	},
	completed: {
		label: 'Terminée',
		emoji: '🎉',
		className: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
	},
	canceled: {
		label: 'Annulée',
		emoji: '🚫',
		className: 'bg-gray-500/15 text-gray-300 ring-1 ring-gray-500/30'
	}
};

// TODO: émoji -> badge ker juliette

/**
 * Codes d'erreur métier de la base (Supabased/docs/ERROR_CODES.md).
 *
 * PostgREST expose le SQLSTATE dans `error.code` et `supabase-js` le remonte tel
 * quel : c'est sur ce champ qu'on branche, jamais sur `error.message`, qui est
 * en français et non versionné. Un `DVBxx` sort en HTTP 500 parce que PostgREST
 * ne connaît pas les codes maison — ce n'est pas une panne, c'est un refus métier.
 */
export const CASH_ERROR_MESSAGES: Record<string, string> = {
	DVB01: "Le campus de livraison n'a pas pu être déterminé. Choisissez-le explicitement.",
	DVB02: 'Cette année scolaire est close : plus aucune écriture ne peut y être enregistrée.',
	DVB03: "Cette transition d'état est impossible depuis l'état actuel de l'item.",
	DVB04:
		"L'arbre des budgets est invalide (cycle, profondeur, ou montant sur un nœud non feuille).",
	DVB05:
		"Imputation invalide : budget non feuille, archivé, d'une autre année, ou somme incorrecte.",
	DVB06: 'Budget dépassé : la commande ne peut pas être passée en attente de livraison.',
	DVB07: 'Flux incohérent (contrepassation ou règlement invalide).',
	DVB10: 'Cette ligne est historique : elle se révoque, elle ne se réécrit pas.',
	'42501': "Vous n'avez pas les droits nécessaires pour cette action.",
	'22023': 'Paramètre invalide.',
	P0002: 'Élément introuvable.',
	'23514': 'Une contrainte de cohérence rejette cette saisie.'
};

/** Traduit une erreur supabase-js en message affichable, sans jamais lire error.message. */
export function cashErrorMessage(code: string | null | undefined, fallback: string): string {
	if (!code) {
		return fallback;
	}
	return CASH_ERROR_MESSAGES[code] ?? fallback;
}

/** États depuis lesquels un membre peut encore modifier son item (CMD-F-02). */
export function isItemEditableByMember(state: ItemState): boolean {
	return state === 'pending_cdp';
}

/** États depuis lesquels un membre peut supprimer son item — miroir de la policy items_delete. */
export function isItemDeletableByMember(state: ItemState): boolean {
	return state === 'pending_cdp' || state === 'refused_cdp' || state === 'refused_treso';
}

/** Un item refusé est terminal, quel que soit l'auteur du refus. */
export function isItemRefused(state: ItemState): boolean {
	return state === 'refused_cdp' || state === 'refused_treso';
}

/**
 * États depuis lesquels un CDP peut encore statuer.
 *
 * Un seul : `pending_cdp`. Une fois validé, l'item appartient au trésorier, et
 * `check_item_transition` refuse tout retour en arrière.
 */
export function isItemReviewableByCdp(state: ItemState): boolean {
	return state === 'pending_cdp';
}

/**
 * Longueur minimale d'un motif de refus.
 *
 * Le motif est la seule chose que le membre lit pour comprendre la décision : un
 * « non » ou un « nop » ne l'aide en rien et le renvoie poser la question de
 * vive voix, ce qu'on est justement censé éviter. La base rejette déjà le motif
 * vide (22023) ; ce seuil est l'exigence de fond, côté saisie.
 */
export const REFUSAL_REASON_MIN_LENGTH = 10;

/**
 * Valide un motif de refus. Renvoie le message d'erreur, ou `null` si le motif
 * convient. Partagé par le refus CDP et par le refus trésorier.
 */
export function refusalReasonError(reason: string): string | null {
	const trimmed = reason.trim();
	if (trimmed.length === 0) {
		return 'Un refus doit être motivé.';
	}
	if (trimmed.length < REFUSAL_REASON_MIN_LENGTH) {
		return `Le motif doit faire au moins ${String(REFUSAL_REASON_MIN_LENGTH)} caractères : c'est la seule explication que le membre recevra.`;
	}
	return null;
}

/**
 * Un item est regroupable tant qu'il est validé et libre de toute commande.
 *
 * `pending_bundled` est le seul état de la file du trésorier : en amont l'item
 * attend son CDP, en aval il appartient déjà à une commande.
 */
export function isItemBundlable(state: ItemState): boolean {
	return state === 'pending_bundled';
}

/**
 * États depuis lesquels le trésorier peut opposer son veto (CMD-F-29, CMD-F-2A).
 *
 * Un item regroupé ne se refuse pas : il faut d'abord annuler la commande qui
 * le porte, ce qui le ramène ici. Un item reçu ne se refuse jamais.
 */
export function isItemRefusableByTreasurer(state: ItemState): boolean {
	return state === 'pending_bundled';
}

/**
 * Une commande se modifie tant qu'elle n'est pas annulée (CMD-F-32).
 *
 * Y compris terminée : la correction a posteriori vise justement ce cas-là —
 * on découvre le montant réellement débité sur le relevé bancaire une fois le
 * colis arrivé. Une commande annulée, elle, n'a plus d'item à corriger.
 */
export function isOrderEditable(state: OrderState): boolean {
	return state !== 'canceled';
}

/** Seule une commande en attente du trésorier se passe (§8). */
export function isOrderPassable(state: OrderState): boolean {
	return state === 'pending_treso';
}

/** L'annulation reste ouverte jusqu'à la livraison complète (§8). */
export function isOrderCancelable(state: OrderState): boolean {
	return state === 'pending_treso' || state === 'pending_delivery';
}
