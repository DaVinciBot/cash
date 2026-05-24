import type { SlotStatus } from '$lib/services/training';

export const categoryOptions = [
	{ value: 'code', text: 'Code' },
	{ value: 'electronics', text: 'Électronique' },
	{ value: 'robotic', text: 'Robotique' },
	{ value: 'software', text: 'Logiciel' },
	{ value: 'other', text: 'Autre', selected: true }
];

export const statusOptions: {
	value: SlotStatus;
	text: string;
	color: string;
	selected?: boolean;
}[] = [
	{ value: 'draft', text: 'Brouillon', color: 'gray-100', selected: true },
	{
		value: 'pending',
		text: 'Planifiée',
		color: 'primary-200'
	},
	{
		value: 'done',
		text: 'Terminée',
		color: 'registered'
	},
	{
		value: 'postponed',
		text: 'Reportée',
		color: 'dark-blue-gray'
	},
	{
		value: 'canceled',
		text: 'Annulée',
		color: 'dark-blue-gray'
	}
];
