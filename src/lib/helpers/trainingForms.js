import { formatParisDatetimeLocal } from '$lib/helpers/parisTime';
import { categoryOptions, statusOptions } from '$lib/helpers/trainingOptions';

export function toDatetimeLocal(dateString) {
	return formatParisDatetimeLocal(dateString);
}

export function buildTrainingFields(training) {
	return [
		{
			name: 'Nom',
			id: 'name',
			type: 'text',
			required: true,
			value: training?.name || ''
		},
		{
			name: 'Catégorie',
			id: 'category',
			type: 'select',
			required: true,
			options: categoryOptions,
			value: training?.category || ''
		},
		{
			name: 'Description',
			id: 'description',
			type: 'textarea',
			wide: true,
			value: training?.description || ''
		},
		{
			name: 'Prérequis',
			id: 'prerequisites',
			type: 'textarea',
			wide: true,
			value: training?.prerequisites || ''
		}
	];
}

export function buildSlotFields({
	slot,
	trainings,
	profiles,
	selectedTrainingId,
	searchProfiles,
	onTrainerChange,
	onTrainingChange
}) {
	const baseTrainingId = selectedTrainingId ?? slot?.training_id ?? null;
	const baseTraining = baseTrainingId
		? (trainings.find((training) => training.training_id === baseTrainingId) ?? null)
		: null;

	const selectedTrainer = slot?.trainer_id
		? profiles.find((profile) => profile.id === slot.trainer_id)
		: null;

	return [
		{
			name: 'Formation',
			id: 'training_id',
			type: 'select',
			required: true,
			options: trainings.map((training) => ({
				value: training.training_id,
				text: training.name
			})),
			value: slot?.training_id ?? selectedTrainingId ?? '',
			onChange: (event) => {
				const target = event.target;
				const nextId = target?.value ? Number(target.value) : null;
				onTrainingChange?.(Number.isNaN(nextId) ? null : nextId);
			}
		},
		{
			name: 'Nom',
			id: 'custom_name',
			type: 'text',
			placeholder: baseTraining?.name || '',
			value: slot ? (slot.name ?? '') : ''
		},
		{
			name: 'Description',
			id: 'custom_description',
			type: 'textarea',
			placeholder: baseTraining?.description || '',
			value: slot ? (slot.description ?? '') : ''
		},
		{
			name: 'Prérequis',
			id: 'custom_prerequisites',
			type: 'textarea',
			placeholder: baseTraining?.prerequisites || '',
			value: slot ? (slot.prerequisites ?? '') : ''
		},
		{
			name: 'Formateur·ice',
			id: 'trainer_id',
			type: 'autocomplete',
			required: true,
			value: selectedTrainer?.username || slot?.trainer_username || '',
			image: selectedTrainer?.avatar_url || slot?.trainer_avatar_url || null,
			data: selectedTrainer?.id || slot?.trainer_id || '',
			onChange: async (event) => {
				const target = event.target;
				onTrainerChange?.(null);
				const search = target?.value?.toLowerCase().trim() || '';
				if (!search) return [];
				return searchProfiles(search);
			},
			onSelect: (nextId) => {
				onTrainerChange?.(nextId);
			}
		},
		{
			name: 'Début',
			id: 'start',
			type: 'datetime-local',
			required: true,
			value: slot ? toDatetimeLocal(slot.start) : ''
		},
		{
			name: 'Durée (h)',
			id: 'duration_hours',
			type: 'number',
			required: true,
			min: 0.5,
			step: 0.5,
			value: slot?.duration_hours ?? 2
		},
		{
			name: 'Lieu',
			id: 'location',
			type: 'text',
			value: slot?.location || ''
		},
		{
			name: 'Places sur site',
			id: 'on_site_seats',
			type: 'number',
			min: 0,
			value: slot?.on_site_seats ?? ''
		},
		{
			name: 'Places en distanciel',
			id: 'remote_seats',
			type: 'number',
			min: 0,
			value: slot?.remote_seats ?? ''
		},
		{
			name: 'Lien visio',
			id: 'video_conference_link',
			type: 'text',
			wide: true,
			value: slot?.video_conference_link || ''
		},
		{
			name: 'Excusable',
			id: 'excusable',
			type: 'checkbox',
			checked: slot?.excusable ?? true
		},
		{
			name: 'Statut',
			id: 'status',
			type: 'select',
			required: true,
			options: statusOptions,
			value: slot?.status || 'draft'
		}
	];
}
