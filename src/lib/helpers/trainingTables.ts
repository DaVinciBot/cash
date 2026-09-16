import { SLOT_STATUS_BADGES, TRAINING_CATEGORY_BADGES } from '$lib/helpers/trainingOptions';
import type { TableCell, TableRow } from '@davincibot/components';
import type {
	SlotStatus,
	StateBadge,
	TrainingCategory,
	TrainingListItem,
	TrainingSlotListItem
} from '@davincibot/lib';
import { formatParisDateTimeShort } from '@davincibot/lib';
import type { Snippet } from 'svelte';

export function formatSlotDate(dateString: string) {
	return formatParisDateTimeShort(dateString);
}

export function findTrainingName(trainingId: number, trainings: TrainingListItem[]) {
	return trainings.find((training) => training.training_id === trainingId)?.name ?? 'Formation';
}

/**
 * Une catégorie inconnue de la base retombe sur « Autre » plutôt que sur du
 * vide : le référentiel du client peut retarder d'une migration sur celui de la
 * base, et une case vide ne dirait pas que la valeur existe.
 */
export function categoryBadge(category: string | null | undefined) {
	const key = (category ?? 'other') as TrainingCategory;
	return Object.hasOwn(TRAINING_CATEGORY_BADGES, key)
		? TRAINING_CATEGORY_BADGES[key]
		: TRAINING_CATEGORY_BADGES.other;
}

export function statusBadge(status: string | null | undefined) {
	const key = (status ?? 'draft') as SlotStatus;
	return Object.hasOwn(SLOT_STATUS_BADGES, key)
		? SLOT_STATUS_BADGES[key]
		: SLOT_STATUS_BADGES.draft;
}

/** Rendu d'une cellule dont la valeur est un `StateBadge`. */
export type BadgeCell = Snippet<[TableCell]>;

/** Libellé d'une cellule de badge, pour l'export CSV. */
export function stateBadgeLabel(cell: TableCell | undefined) {
	return (cell?.value as StateBadge | undefined)?.label ?? '';
}

interface TrainingRawItem {
	id: number;
	name: string;
	description: string | null;
	prerequisites: string | null;
	category: string;
}

interface SlotRawItem {
	id: number;
	training_id: number;
	name: string | null;
	description: string | null;
	prerequisites: string | null;
	category: string | null;
	start: string;
	duration_hours: number;
	on_site_seats: number | null;
	remote_seats: number | null;
	location: string | null;
	video_conference_link: string | null;
	excusable: boolean;
	status: string;
	trainer_id: string;
	trainer_username: string | null;
	trainer_avatar_url: string | null;
}

export function createTrainingTableItems(data: TrainingRawItem[], badgeCell: BadgeCell) {
	const index = new Map<number, TrainingListItem>(
		data.map((training) => [
			training.id,
			{
				training_id: training.id,
				name: training.name,
				description: training.description,
				prerequisites: training.prerequisites,
				category: training.category as TrainingCategory
			}
		])
	);

	const rows: TableRow[] = data.map((training) => [
		{ value: training.name, data: training.id },
		{ value: categoryBadge(training.category), cell: badgeCell },
		{ value: training.description ?? 'Aucune description' }
	]);

	return { index, rows };
}

export function createSlotTableItems(data: SlotRawItem[], badgeCell: BadgeCell) {
	const index = new Map<number, TrainingSlotListItem>(
		data.map((slot) => [
			slot.id,
			{
				slot_id: slot.id,
				training_id: slot.training_id,
				name: slot.name ?? '',
				description: slot.description,
				prerequisites: slot.prerequisites,
				category: (slot.category ?? 'other') as TrainingCategory,
				start: slot.start,
				duration_hours: slot.duration_hours,
				on_site_seats: slot.on_site_seats,
				remote_seats: slot.remote_seats,
				on_site_registered: null,
				remote_registered: null,
				on_site_waitlisted: null,
				remote_waitlisted: null,
				on_site_remaining: null,
				remote_remaining: null,
				location: slot.location,
				video_conference_link: slot.video_conference_link,
				excusable: slot.excusable,
				status: slot.status as SlotStatus,
				trainer_id: slot.trainer_id,
				trainer_username: slot.trainer_username,
				trainer_avatar_url: slot.trainer_avatar_url
			}
		])
	);

	const rows: TableRow[] = data.map((slot) => [
		{ value: formatSlotDate(slot.start), data: slot.id },
		{ value: slot.name ?? '' },
		{ value: slot.trainer_username ?? 'À définir', avatar: slot.trainer_avatar_url },
		{ value: statusBadge(slot.status), cell: badgeCell }
	]);

	return { index, rows };
}
