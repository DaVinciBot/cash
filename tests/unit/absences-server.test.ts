import { describe, expect, it } from 'vitest';

import { isReviewer } from '#lib/server/absences.js';

// `locals.permissions` n'est rempli que par le load du layout, qui ne tourne pas
// pour une action de formulaire : la vue Secrétaire interroge donc la base.
describe('droit de traitement', () => {
	const client = (answer: { data: boolean | null; error: { message: string } | null }) => {
		const calls: unknown[][] = [];
		const stub = {
			rpc: (...args: unknown[]) => {
				calls.push(args);
				return Promise.resolve(answer);
			}
		};
		return { calls, supabase: stub as unknown as Parameters<typeof isReviewer>[0] };
	};

	it('demande à la base la permission de revue', async () => {
		const { calls, supabase } = client({ data: true, error: null });
		expect(await isReviewer(supabase)).toBe(true);
		expect(calls).toEqual([['has_permission', { p_permission: 'absences.requests.review' }]]);
	});

	it('refuse sur un non ou sur une erreur', async () => {
		expect(await isReviewer(client({ data: false, error: null }).supabase)).toBe(false);
		expect(await isReviewer(client({ data: null, error: { message: 'boom' } }).supabase)).toBe(
			false
		);
	});
});
