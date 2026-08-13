import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/public', () => ({ env: {} }));

const mocks = vi.hoisted(() => ({
	rpc: vi.fn()
}));

vi.mock('@davincibot/lib/supabase', () => ({
	getSupabaseBrowserClient: () => ({ rpc: mocks.rpc })
}));

import { submitReport, type ReportInput } from '$lib/settings';

const baseInput: ReportInput = {
	type: 'bug',
	title: 'Titre',
	description: 'Description',
	images: []
};

describe('submitReport — transmission de p_anonymous', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.rpc.mockResolvedValue({ error: null });
	});

	it("envoie p_anonymous: false quand l'option est absente", async () => {
		await submitReport('user-1', baseInput);

		expect(mocks.rpc).toHaveBeenCalledWith(
			'submit_report',
			expect.objectContaining({ p_anonymous: false })
		);
	});

	it('envoie p_anonymous: true quand le signalement est anonyme', async () => {
		await submitReport('user-1', { ...baseInput, anonymous: true });

		expect(mocks.rpc).toHaveBeenCalledWith(
			'submit_report',
			expect.objectContaining({ p_anonymous: true })
		);
	});
});
