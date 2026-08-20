import type { SlotStatus, StateBadge, TrainingCategory } from '@davincibot/lib';

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
		emoji: '⌨️',
		className: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30'
	},
	electronics: {
		label: 'Électronique',
		emoji: '🔌',
		className: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
	},
	robotic: {
		label: 'Robotique',
		emoji: '🤖',
		className: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30'
	},
	software: {
		label: 'Logiciel',
		emoji: '💾',
		className: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
	},
	other: {
		label: 'Autre',
		emoji: '📘',
		className: 'bg-gray-500/15 text-gray-300 ring-1 ring-gray-500/30'
	}
};

/**
 * Un brouillon n'est pas une session annulée : le premier attend d'être fini,
 * la seconde ne se tiendra pas. Deux teintes distinctes, donc.
 */
export const SLOT_STATUS_BADGES: Record<SlotStatus, StateBadge> = {
	draft: {
		label: 'Brouillon',
		emoji: '📝',
		className: 'bg-gray-500/15 text-gray-300 ring-1 ring-gray-500/30'
	},
	pending: {
		label: 'Planifiée',
		emoji: '🕓',
		className: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30'
	},
	done: {
		label: 'Terminée',
		emoji: '🎉',
		className: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
	},
	postponed: {
		label: 'Reportée',
		emoji: '⏭️',
		className: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
	},
	canceled: {
		label: 'Annulée',
		emoji: '🚫',
		className: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30'
	}
};

export const TRAINING_CATEGORIES = Object.keys(TRAINING_CATEGORY_BADGES) as TrainingCategory[];

export const SLOT_STATUSES = Object.keys(SLOT_STATUS_BADGES) as SlotStatus[];

/**
 * Les listes déroulantes et les filtres lisent le même référentiel que les
 * badges : ajouter une catégorie au-dessus suffit à la voir partout.
 */
export const categoryOptions: { value: TrainingCategory; text: string; selected?: boolean }[] =
	TRAINING_CATEGORIES.map((value) => ({
		value,
		text: TRAINING_CATEGORY_BADGES[value].label,
		...(value === 'other' ? { selected: true } : {})
	}));

export const statusOptions: { value: SlotStatus; text: string; selected?: boolean }[] =
	SLOT_STATUSES.map((value) => ({
		value,
		text: SLOT_STATUS_BADGES[value].label,
		...(value === 'draft' ? { selected: true } : {})
	}));
