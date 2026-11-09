import type { BadgeIcon } from '#lib/components/cash/stateIcons.js';
import type { SlotStatus, StateBadge, TrainingCategory } from '@davincibot/lib';
import {
	Ban,
	BookOpen,
	Bot,
	CircleCheck,
	CircuitBoard,
	Clock,
	Code,
	HardDrive,
	PencilLine,
	SkipForward
} from '@lucide/svelte';

// Repères visuels des formations, écrits dans la même grammaire que les états
// d'item et de commande (CMD-F-22) : fond teinté à quinze pour cent, texte
// clair, anneau assorti. Un seul référentiel par domaine, sinon les statuts
// redeviennent incohérents entre la table, les filtres et les cartes mobiles.
//
// La couleur ne porte jamais seule l'information : le libellé est toujours
// écrit, ce qui garde les états lisibles en cas de daltonisme.

export const TRAINING_CATEGORY_BADGES: Record<TrainingCategory, StateBadge> = {
	code: {
		label: 'Code',
		className: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30'
	},
	electronics: {
		label: 'Électronique',
		className: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
	},
	robotic: {
		label: 'Robotique',
		className: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30'
	},
	software: {
		label: 'Logiciel',
		className: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
	},
	other: {
		label: 'Autre',
		className: 'bg-blue-gray/15 text-dark-light-blue ring-1 ring-rule'
	}
};

/**
 * Un brouillon n'est pas une session annulée : le premier attend d'être fini,
 * la seconde ne se tiendra pas. Deux teintes distinctes, donc.
 */
export const SLOT_STATUS_BADGES: Record<SlotStatus, StateBadge> = {
	draft: {
		label: 'Brouillon',
		className: 'bg-blue-gray/15 text-dark-light-blue ring-1 ring-rule'
	},
	pending: {
		label: 'Planifiée',
		className: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30'
	},
	done: {
		label: 'Terminée',
		className: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
	},
	postponed: {
		label: 'Reportée',
		className: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
	},
	canceled: {
		label: 'Annulée',
		className: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30'
	}
};

export const TRAINING_CATEGORIES = Object.keys(TRAINING_CATEGORY_BADGES) as TrainingCategory[];

export const SLOT_STATUSES = Object.keys(SLOT_STATUS_BADGES) as SlotStatus[];

/**
 * Les listes déroulantes et les filtres lisent le même référentiel que les
 * badges : ajouter une catégorie au-dessus suffit à la voir partout.
 */
export const categoryOptions: { value: TrainingCategory; text: string }[] = TRAINING_CATEGORIES.map(
	(value) => ({
		value,
		text: TRAINING_CATEGORY_BADGES[value].label
	})
);

export const statusOptions: { value: SlotStatus; text: string }[] = SLOT_STATUSES.map((value) => ({
	value,
	text: SLOT_STATUS_BADGES[value].label
}));

export const DEFAULT_TRAINING_CATEGORY: TrainingCategory = 'other';

export const DEFAULT_SLOT_STATUS: SlotStatus = 'draft';

// Pendant iconographique des deux registres ci-dessus.
export const TRAINING_CATEGORY_ICONS: Record<TrainingCategory, BadgeIcon> = {
	code: Code,
	electronics: CircuitBoard,
	robotic: Bot,
	software: HardDrive,
	other: BookOpen
};

export const SLOT_STATUS_ICONS: Record<SlotStatus, BadgeIcon> = {
	draft: PencilLine,
	pending: Clock,
	done: CircleCheck,
	postponed: SkipForward,
	canceled: Ban
};
