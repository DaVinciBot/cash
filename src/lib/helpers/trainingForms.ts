import {
	DEFAULT_SLOT_STATUS,
	DEFAULT_TRAINING_CATEGORY,
	categoryOptions,
	statusOptions
} from '#lib/helpers/trainingOptions.js';
import type { SelectOption, TrainingListItem, TrainingSlotListItem } from '@davincibot/lib';
import { formatParisDatetimeLocal } from '@davincibot/lib';

export interface SummaryFieldsConfig {
	from: string;
	to: string;
	text: string;
}

export function buildSummaryFields({ from, to, text }: SummaryFieldsConfig) {
	return [
		{
			id: 'summary_from',
			name: 'Date de début',
			type: 'date',
			required: true,
			value: from
		},
		{
			id: 'summary_to',
			name: 'Date de fin',
			type: 'date',
			required: true,
			value: to
		},
		{
			id: 'summary_text',
			name: 'Texte',
			type: 'textarea',
			placeholder: 'Optionnel',
			value: text,
			wide: true
		}
	];
}

export interface ProfileOption {
	id: string;
	username: string | null;
	avatar_url: string | null;
	email: string | null;
}

export function buildTrainingFields(training: TrainingListItem | null) {
	return [
		{
			name: 'Nom',
			id: 'name',
			type: 'text',
			required: true,
			value: training?.name ?? ''
		},
		{
			name: 'Catégorie',
			id: 'category',
			type: 'select',
			required: true,
			options: categoryOptions.map((option) => ({
				...option,
				selected: option.value === (training?.category ?? DEFAULT_TRAINING_CATEGORY)
			})),
			value: training?.category
		},
		{
			name: 'Description',
			id: 'description',
			type: 'textarea',
			wide: true,
			value: training?.description ?? ''
		},
		{
			name: 'Prérequis',
			id: 'prerequisites',
			type: 'textarea',
			wide: true,
			value: training?.prerequisites ?? ''
		}
	];
}

export interface SlotFieldsConfig {
	slot: TrainingSlotListItem | null;
	trainings: TrainingListItem[];
	profiles: ProfileOption[];
	selectedTrainingId?: number | null;
	searchTrainings: (search: string) => Promise<{ value: string; text: string }[]>;
	searchProfiles: (search: string) => Promise<{ value: string; text: string; image?: string }[]>;
	onTrainerChange?: (nextId: string | null) => void;
	onTrainingChange?: (nextId: number | null) => void;
	/** formation#47 — places séparées par modalité, ou communes aux deux. */
	capacityMode?: CapacityMode;
	onCapacityModeChange?: (mode: CapacityMode) => void;
	/** formation#52 — associations et projets proposables comme groupes prioritaires. */
	priorityOptions?: SelectOption[];
	/** Valeurs choisies (`a:<id>`, `p:<id>`). */
	priorityGroups?: string[];
	onPriorityGroupsChange?: (values: string[]) => void;
}

export type CapacityMode = 'separate' | 'shared';

export const CAPACITY_MODE_OPTIONS: { value: CapacityMode; text: string }[] = [
	{ value: 'separate', text: 'Places séparées (sur site / à distance)' },
	{ value: 'shared', text: 'Places communes (sur site ou à distance)' }
];

/**
 * `shared_seats` arrive avec la prochaine version de `@davincibot/lib`
 * (DaVinciBot/packages#66) : d'ici là, il se lit par ce type local.
 */
interface SlotCapacity {
	shared_seats?: number | null;
}

const sharedSeatsOf = (slot: object | null) =>
	slot === null ? null : ((slot as SlotCapacity).shared_seats ?? null);

/** Mode d'une session existante : communes dès qu'une capacité commune est posée. */
export function capacityModeOf(slot: object | null): CapacityMode {
	return sharedSeatsOf(slot) === null ? 'separate' : 'shared';
}

export function buildSlotFields({
	slot,
	trainings,
	profiles,
	selectedTrainingId,
	searchTrainings,
	searchProfiles,
	onTrainerChange,
	onTrainingChange,
	capacityMode = capacityModeOf(slot),
	onCapacityModeChange,
	priorityOptions = [],
	priorityGroups = [],
	onPriorityGroupsChange
}: SlotFieldsConfig) {
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
			type: 'autocomplete',
			required: true,
			placeholder: 'Rechercher une formation',
			value: baseTraining?.name ?? '',
			data: baseTraining?.training_id ?? '',
			onChange: (event: Event) => {
				const target = event.target as HTMLInputElement | null;
				const search = target?.value.toLowerCase().trim() ?? '';
				return search ? searchTrainings(search) : [];
			},
			onSelect: (nextId: string) => {
				const parsedId = Number(nextId);
				onTrainingChange?.(Number.isNaN(parsedId) ? null : parsedId);
			}
		},
		{
			name: 'Nom',
			id: 'custom_name',
			type: 'text',
			placeholder: baseTraining?.name ?? '',
			value: slot ? slot.name : ''
		},
		{
			name: 'Description',
			id: 'custom_description',
			type: 'textarea',
			placeholder: baseTraining?.description ?? '',
			value: slot ? (slot.description ?? '') : ''
		},
		{
			name: 'Prérequis',
			id: 'custom_prerequisites',
			type: 'textarea',
			placeholder: baseTraining?.prerequisites ?? '',
			value: slot ? (slot.prerequisites ?? '') : ''
		},
		{
			name: 'Formateur·ice',
			id: 'trainer_id',
			type: 'autocomplete',
			required: true,
			value: selectedTrainer?.username ?? slot?.trainer_username ?? '',
			image: selectedTrainer?.avatar_url ?? slot?.trainer_avatar_url ?? null,
			data: selectedTrainer?.id ?? slot?.trainer_id ?? '',
			onChange: async (event: Event) => {
				const target = event.target as HTMLInputElement | null;
				onTrainerChange?.(null);
				const search = target?.value.toLowerCase().trim() ?? '';
				if (!search) {
					return [];
				}
				return searchProfiles(search);
			},
			onSelect: (nextId: string) => {
				onTrainerChange?.(nextId);
			}
		},
		{
			name: 'Début',
			id: 'start',
			type: 'datetime-local',
			required: true,
			value: slot ? formatParisDatetimeLocal(slot.start) : ''
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
			value: slot?.location ?? ''
		},
		{
			name: 'Type de capacité',
			id: 'capacity_mode',
			type: 'select',
			required: true,
			options: CAPACITY_MODE_OPTIONS.map((option) => ({
				...option,
				selected: option.value === capacityMode
			})),
			value: capacityMode,
			onChange: (event: Event) => {
				const value = (event.target as HTMLSelectElement | null)?.value;
				onCapacityModeChange?.(value === 'shared' ? 'shared' : 'separate');
				return undefined;
			}
		},
		...(capacityMode === 'shared'
			? [
					{
						name: 'Places (sur site ou à distance)',
						id: 'shared_seats',
						type: 'number',
						min: 0,
						required: true,
						value: sharedSeatsOf(slot) ?? slot?.on_site_seats ?? ''
					}
				]
			: [
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
					}
				]),
		{
			name: 'Lien visio',
			id: 'video_conference_link',
			type: 'text',
			wide: true,
			value: slot?.video_conference_link ?? ''
		},
		{
			name: 'Excusable',
			id: 'excusable',
			type: 'checkbox',
			checked: slot?.excusable ?? true
		},
		// formation#52 — jusqu'à 24 h avant le début, seuls les membres de ces
		// groupes prennent une place ; les autres attendent la libération.
		{
			name: 'Groupes prioritaires (facultatif)',
			id: 'priority_groups',
			type: 'select',
			multiple: true,
			wide: true,
			options: priorityOptions.map((option) => ({
				...option,
				selected: priorityGroups.includes(option.value)
			})),
			onChange: (event: Event) => {
				const select = event.target as HTMLSelectElement;
				onPriorityGroupsChange?.(Array.from(select.selectedOptions, (option) => option.value));
				return undefined;
			}
		},
		{
			name: 'Statut',
			id: 'status',
			type: 'select',
			required: true,
			options: statusOptions.map((option) => ({
				...option,
				selected: option.value === (slot?.status ?? DEFAULT_SLOT_STATUS)
			})),
			value: slot?.status
		}
	];
}
