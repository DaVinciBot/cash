import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/helpers/parisTime', () => ({
	formatParisDatetimeLocal: vi.fn((value: string) => `local:${value}`)
}));

import {
	buildSlotFields,
	buildSummaryFields,
	buildTrainingFields
} from '../../src/lib/helpers/trainingForms';

describe('training form helpers', () => {
	it('buildSummaryFields maps input values to fields', () => {
		const fields = buildSummaryFields({ from: '2025-01-01', to: '2025-01-31', text: 'Summary' });

		expect(fields).toHaveLength(3);
		expect(fields[0]).toMatchObject({ id: 'summary_from', value: '2025-01-01', required: true });
		expect(fields[1]).toMatchObject({ id: 'summary_to', value: '2025-01-31', required: true });
		expect(fields[2]).toMatchObject({ id: 'summary_text', value: 'Summary', type: 'textarea' });
	});

	it('buildTrainingFields returns defaults when training is null', () => {
		const fields = buildTrainingFields(null);

		expect(fields.map((field) => field.id)).toEqual([
			'name',
			'category',
			'description',
			'prerequisites'
		]);
		expect(fields.at(0)?.value).toBe('');
	});

	it('buildSlotFields wires autocomplete and trainer callbacks', async () => {
		const trainings = [
			{
				training_id: 1,
				name: 'Svelte',
				description: 'Desc',
				prerequisites: 'JS',
				category: 'software' as const
			}
		];
		const profiles = [
			{ id: 'trainer-1', username: 'Alice', avatar_url: '/alice.png', email: 'alice@example.com' }
		];
		const slot = {
			slot_id: 10,
			training_id: 1,
			name: 'Svelte',
			description: null,
			prerequisites: null,
			category: 'software' as const,
			start: '2025-01-10T10:00:00.000Z',
			duration_hours: 2,
			on_site_seats: 10,
			remote_seats: 5,
			on_site_registered: null,
			remote_registered: null,
			on_site_waitlisted: null,
			remote_waitlisted: null,
			on_site_remaining: null,
			remote_remaining: null,
			location: null,
			video_conference_link: null,
			excusable: true,
			status: 'draft' as const,
			trainer_id: 'trainer-1',
			trainer_username: 'Alice',
			trainer_avatar_url: '/alice.png'
		};

		const searchTrainings = vi.fn((search: string) =>
			Promise.resolve([{ value: 1, text: search }])
		);
		const searchProfiles = vi.fn((search: string) =>
			Promise.resolve([{ value: 'trainer-2', text: search }])
		);
		const onTrainingChange = vi.fn();
		const onTrainerChange = vi.fn();

		const fields = buildSlotFields({
			slot,
			trainings,
			profiles,
			searchTrainings,
			searchProfiles,
			onTrainingChange,
			onTrainerChange
		});

		const trainingField = fields.find((field) => field.id === 'training_id');
		const trainerField = fields.find((field) => field.id === 'trainer_id');
		const startField = fields.find((field) => field.id === 'start');

		const trainingResults = await trainingField?.onChange?.({
			target: { value: ' TS ' }
		} as unknown as Event);
		expect(searchTrainings).toHaveBeenCalledWith('ts');
		expect(trainingResults).toEqual([{ value: 1, text: 'ts' }]);

		trainingField?.onSelect?.('42');
		trainingField?.onSelect?.('abc');
		expect(onTrainingChange).toHaveBeenNthCalledWith(1, 42);
		expect(onTrainingChange).toHaveBeenNthCalledWith(2, null);

		const profileResults = await trainerField?.onChange?.({
			target: { value: ' Bob ' }
		} as unknown as Event);
		expect(onTrainerChange).toHaveBeenCalledWith(null);
		expect(searchProfiles).toHaveBeenCalledWith('bob');
		expect(profileResults).toEqual([{ value: 'trainer-2', text: 'bob' }]);

		trainerField?.onSelect?.('trainer-2');
		expect(onTrainerChange).toHaveBeenLastCalledWith('trainer-2');
		expect(startField?.value).toBe('local:2025-01-10T10:00:00.000Z');
	});
});
