import { describe, expect, it, vi } from 'vitest';

vi.mock('@davincibot/lib/supabase', () => ({}));

import { parsePriorityValue, priorityValue } from '../../src/lib/helpers/priorityGroups';

describe('groupes prioritaires (formation#52)', () => {
	it('encode une association et un projet', () => {
		expect(priorityValue({ association_id: 1, project_id: null })).toBe('a:1');
		expect(priorityValue({ association_id: null, project_id: 14 })).toBe('p:14');
	});

	it('relit les valeurs et rejette le reste', () => {
		expect(parsePriorityValue('a:1')).toEqual({ association_id: 1, project_id: null });
		expect(parsePriorityValue('p:14')).toEqual({ association_id: null, project_id: 14 });
		expect(parsePriorityValue('NULL')).toBeNull();
		expect(parsePriorityValue('x:3')).toBeNull();
	});
});
