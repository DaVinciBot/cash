import { describe, expect, it, vi } from 'vitest';

vi.mock('@davincibot/lib', () => ({
	formatParisDateTimeShort: vi.fn((value: string) => `short:${value}`)
}));

import type { TrainingListItem } from '@davincibot/lib';
import {
	createSlotTableItems,
	createTrainingTableItems,
	findTrainingName,
	formatSlotDate
} from '../../src/lib/helpers/trainingTables';

describe('training table helpers', () => {
	it('formatSlotDate uses paris short datetime formatter', () => {
		expect(formatSlotDate('2025-01-10T10:00:00.000Z')).toBe('short:2025-01-10T10:00:00.000Z');
	});

	it('findTrainingName resolves known and unknown ids', () => {
		const trainings: TrainingListItem[] = [
			{
				training_id: 2,
				name: 'TS',
				description: null,
				prerequisites: null,
				category: 'software'
			}
		];

		expect(findTrainingName(2, trainings)).toBe('TS');
		expect(findTrainingName(9, trainings)).toBe('Formation');
	});

	it('createTrainingTableItems returns index and display rows', () => {
		const { index, rows } = createTrainingTableItems([
			{ id: 1, name: 'Svelte', description: null, prerequisites: null, category: 'software' }
		]);

		expect(index.get(1)).toMatchObject({ training_id: 1, name: 'Svelte' });
		expect(rows.at(0)?.at(0)).toEqual({ value: 'Svelte', data: 1 });
		expect(rows.at(0)?.at(2)).toEqual({ value: 'Aucune description' });
	});

	it('createSlotTableItems maps nested slot/trainer data', () => {
		const { index, rows } = createSlotTableItems([
			{
				id: 3,
				training_id: 1,
				custom_name: null,
				custom_description: null,
				custom_prerequisites: null,
				start: '2025-01-10T10:00:00.000Z',
				duration_hours: 2,
				on_site_seats: 10,
				remote_seats: 5,
				location: 'Fablab',
				video_conference_link: null,
				excusable: true,
				status: 'draft',
				trainer_id: 't-1',
				training: {
					name: 'Svelte',
					description: 'Desc',
					prerequisites: 'JS',
					category: 'software'
				},
				profiles: { username: null, avatar_url: null }
			}
		]);

		expect(index.get(3)).toMatchObject({
			slot_id: 3,
			name: 'Svelte',
			trainer_username: null
		});
		expect(rows.at(0)?.at(0)?.value).toBe('short:2025-01-10T10:00:00.000Z');
		expect(rows.at(0)?.at(2)?.value).toBe('À définir');
	});
});
