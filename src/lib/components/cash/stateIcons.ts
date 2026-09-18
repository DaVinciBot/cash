// Repères iconographiques des états, en pendant des registres de couleurs de
// @davincibot/lib.
//
// Ces registres portent un champ `emoji` hérité du premier jet (CMD-F-22). Un
// emoji dépend de la police du système : il change de dessin d'un poste à
// l'autre, ne s'aligne pas sur la grille typographique et n'hérite pas de la
// couleur du texte. Les icônes Lucide, elles, sont des SVG qui prennent la
// teinte du badge et gardent la même allure partout.
//
// La clé est la même que celle du registre de couleurs correspondant : les deux
// tables se lisent côte à côte et ne peuvent pas diverger sans que TypeScript
// le signale.

import type { ActivityKind, Campus, FlowDirection, ItemState, OrderState } from '@davincibot/lib';
import {
	Ban,
	Banknote,
	CircleCheck,
	CirclePlus,
	Clock,
	MapPin,
	Package,
	PackageCheck,
	Pencil,
	RefreshCw,
	Trash2,
	TrendingDown,
	TrendingUp,
	Truck
} from '@lucide/svelte';
import type { Component } from 'svelte';

export type BadgeIcon = Component<{ class?: string }>;

export const ITEM_STATE_ICONS: Record<ItemState, BadgeIcon> = {
	pending_cdp: Clock,
	pending_bundled: CircleCheck,
	bundled: Package,
	received: PackageCheck,
	refused_cdp: Ban,
	// Le trésorier refuse pour une raison d'argent : l'icône le dit, là où deux
	// interdictions identiques auraient obligé à lire la couleur.
	refused_treso: Banknote
};

export const ORDER_STATE_ICONS: Record<OrderState, BadgeIcon> = {
	pending_treso: Clock,
	pending_delivery: Truck,
	completed: CircleCheck,
	canceled: Ban
};

// Nantes et Paris partagent l'icône : c'est la couleur qui les sépare
// (TRANS-NF-41), et le libellé est toujours écrit à côté.
export const CAMPUS_ICONS: Record<Campus, BadgeIcon> = {
	nantes: MapPin,
	paris: MapPin
};

export const FLOW_DIRECTION_ICONS: Record<FlowDirection, BadgeIcon> = {
	debit: TrendingDown,
	credit: TrendingUp
};

export const ACTIVITY_ICONS: Record<ActivityKind, BadgeIcon> = {
	created: CirclePlus,
	updated: Pencil,
	state_changed: RefreshCw,
	deleted: Trash2
};
