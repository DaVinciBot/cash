import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/helpers/parisTime', () => ({
	formatParisDatetimeLocal: vi.fn((value) => `local:${value}`)
}));

import {
	buildSlotFields,
	buildTrainingFields,
	toDatetimeLocal
} from '../../src/lib/helpers/trainingForms.js';

describe('training form helpers', () => {
	it('toDatetimeLocal delegates to paris helper', () => {
		expect(toDatetimeLocal('2025-01-10T10:00:00.000Z')).toBe('local:2025-01-10T10:00:00.000Z');
	});

	it('buildTrainingFields returns required defaults', () => {
		const fields = buildTrainingFields(null);
		expect(fields.map((field) => field.id)).toEqual([
			'name',
			'category',
			'description',
			'prerequisites'
		]);
		expect(fields[0].required).toBe(true);
	});

	it('buildSlotFields wires callbacks and placeholders', async () => {
		const trainings = [
			{ training_id: 1, name: 'Svelte', description: 'Desc', prerequisites: 'JS' },
			{ training_id: 2, name: 'TS', description: 'Type', prerequisites: 'Basics' }
		];
		const profiles = [{ id: 'trainer-1', username: 'Alice', avatar_url: '/alice.png' }];
		const slot = {
			training_id: 1,
			trainer_id: 'trainer-1',
			start: '2025-01-10T10:00:00.000Z',
			name: null,
			description: null,
			prerequisites: null,
			duration_hours: 2,
			status: 'draft'
		};

		const onTrainingChange = vi.fn();
		const onTrainerChange = vi.fn();
		const searchProfiles = vi.fn(async (query) => [{ value: 'trainer-2', text: query }]);

		const fields = buildSlotFields({
			slot,
			trainings,
			profiles,
			searchProfiles,
			onTrainerChange,
			onTrainingChange
		});

		const trainingField = fields.find((field) => field.id === 'training_id');
		const trainerField = fields.find((field) => field.id === 'trainer_id');
		const startField = fields.find((field) => field.id === 'start');

		trainingField.onChange({ target: { value: '2' } });
		trainingField.onChange({ target: { value: '' } });
		expect(onTrainingChange).toHaveBeenNthCalledWith(1, 2);
		expect(onTrainingChange).toHaveBeenNthCalledWith(2, null);

		const profileResults = await trainerField.onChange({ target: { value: ' Bob ' } });
		expect(onTrainerChange).toHaveBeenCalledWith(null);
		expect(searchProfiles).toHaveBeenCalledWith('bob');
		expect(profileResults).toEqual([{ value: 'trainer-2', text: 'bob' }]);

		trainerField.onSelect('trainer-2');
		expect(onTrainerChange).toHaveBeenLastCalledWith('trainer-2');

		expect(startField.value).toBe('local:2025-01-10T10:00:00.000Z');
	});
});
