import { categoryOptions, statusOptions } from '$lib/helpers/trainingOptions';
import { Badge } from '@davincibot/components';
import type {
	SlotStatus,
	TrainingCategory,
	TrainingListItem,
	TrainingSlotListItem
} from '@davincibot/lib';
import { formatParisDateTimeShort } from '@davincibot/lib';

export function formatSlotDate(dateString: string) {
	return formatParisDateTimeShort(dateString);
}

export function findTrainingName(trainingId: number, trainings: TrainingListItem[]) {
	return trainings.find((training) => training.training_id === trainingId)?.name ?? 'Formation';
}

function getCategoryLabel(category: string) {
	return categoryOptions.find((opt) => opt.value === category)?.text ?? 'Autre';
}

function getStatusOption(status: string) {
	return statusOptions.find((opt) => opt.value === status);
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

export function createTrainingTableItems(data: TrainingRawItem[]) {
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

	const rows = data.map((training) => [
		{ value: training.name, data: training.id },
		{
			component: Badge,
			props: {
				text: getCategoryLabel(training.category),
				color: 'light-blue'
			}
		},
		{ value: training.description ?? 'Aucune description' }
	]);

	return { index, rows };
}

export function createSlotTableItems(data: SlotRawItem[]) {
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

	const rows = data.map((slot) => {
		const statusOption = getStatusOption(slot.status);
		return [
			{ value: formatSlotDate(slot.start), data: slot.id },
			{ value: slot.name ?? '' },
			{ value: slot.trainer_username ?? 'À définir', avatar: slot.trainer_avatar_url },
			{
				component: Badge,
				props: {
					text: statusOption?.text ?? slot.status,
					color: statusOption?.color
				}
			}
		];
	});

	return { index, rows };
}
