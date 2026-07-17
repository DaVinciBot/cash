import { Badge } from '@davincibot/components';
import { formatParisDateTimeShort } from '@davincibot/lib';
import { categoryOptions, statusOptions } from '$lib/helpers/trainingOptions';
import type {
	SlotStatus,
	TrainingCategory,
	TrainingListItem,
	TrainingSlotListItem
} from '@davincibot/lib';

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
	custom_name: string | null;
	custom_description: string | null;
	custom_prerequisites: string | null;
	start: string;
	duration_hours: number;
	on_site_seats: number | null;
	remote_seats: number | null;
	location: string | null;
	video_conference_link: string | null;
	excusable: boolean;
	status: string;
	trainer_id: string;
	training: {
		name: string | null;
		description: string | null;
		prerequisites: string | null;
		category: string | null;
	} | null;
	profiles: {
		username: string | null;
		avatar_url: string | null;
	} | null;
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
		data.map((slot) => {
			const training = slot.training;
			const trainer = slot.profiles;
			return [
				slot.id,
				{
					slot_id: slot.id,
					training_id: slot.training_id,
					name: slot.custom_name ?? training?.name ?? '',
					description: slot.custom_description ?? training?.description ?? null,
					prerequisites: slot.custom_prerequisites ?? training?.prerequisites ?? null,
					category: (training?.category ?? 'other') as TrainingCategory,
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
					trainer_username: trainer?.username ?? null,
					trainer_avatar_url: trainer?.avatar_url ?? null
				}
			];
		})
	);

	const rows = data.map((slot) => {
		const training = slot.training;
		const trainer = slot.profiles;
		const name = slot.custom_name ?? training?.name ?? '';
		const statusOption = getStatusOption(slot.status);
		return [
			{ value: formatSlotDate(slot.start), data: slot.id },
			{ value: name },
			{ value: trainer?.username ?? 'À définir', avatar: trainer?.avatar_url },
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
