import { describe, expect, it } from 'vitest';

import {
	formatParisDate,
	formatParisDatetimeLocal,
	formatParisDayShort,
	formatParisTime,
	formatParisTimeRange,
	getParisDateKey,
	getParisDateParts,
	getParisDateUtc,
	getParisMidnightUtcFromParts,
	parseParisDatetimeLocal
} from '../../src/lib/helpers/parisTime.js';

describe('paris time helpers', () => {
	it('formats valid dates and times', () => {
		expect(formatParisDate('2025-01-10T12:00:00.000Z')).toBe('10/01/2025');
		expect(formatParisDayShort('2025-01-10T12:00:00.000Z')).toBe('10/01');
		expect(formatParisTime('2025-01-10T12:00:00.000Z')).toMatch(/^\d{2}h\d{2}$/);
	});

	it('returns placeholders for invalid input', () => {
		expect(formatParisDate('invalid')).toBe('--/--/----');
		expect(formatParisDayShort('invalid')).toBe('--/--');
		expect(formatParisTime('invalid')).toBe('--h--');
		expect(formatParisTimeRange('invalid', 2)).toBe('--h-- - --h--');
		expect(formatParisDatetimeLocal('invalid')).toBe('');
		expect(parseParisDatetimeLocal('')).toBe('');
		expect(parseParisDatetimeLocal('invalid')).toBe('');
	});

	it('formats and parses local datetime consistently', () => {
		const parsed = parseParisDatetimeLocal('2025-01-10T10:30');

		expect(parsed).toMatch(/^2025-01-10T/);
		expect(parsed.endsWith('Z')).toBe(true);
		expect(formatParisDatetimeLocal(parsed)).toBe('2025-01-10T10:30');
	});

	it('builds date keys and parts', () => {
		expect(getParisDateKey('2025-01-10T12:00:00.000Z')).toBe('2025-01-10');
		expect(getParisDateParts('2025-01-10T12:00:00.000Z')).toEqual({ year: 2025, month: 1, day: 10 });
		expect(getParisDateParts('invalid')).toBeNull();
	});

	it('computes paris midnight UTC dates', () => {
		const midnight = getParisMidnightUtcFromParts({ year: 2025, month: 1, day: 10 });
		const midnightFromValue = getParisDateUtc('2025-01-10T12:00:00.000Z');

		expect(midnight).toBeInstanceOf(Date);
		expect(midnightFromValue).toBeInstanceOf(Date);
		expect(midnight?.toISOString()).toBe(midnightFromValue?.toISOString());
		expect(getParisDateUtc('invalid')).toBeNull();
	});
});
