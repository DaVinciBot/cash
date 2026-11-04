import { describe, expect, it } from 'vitest';

import { isReviewer, parseReviewFilters } from '#lib/server/absences.js';

// Les filtres de la vue Secrétaire voyagent dans l'URL : une valeur trafiquée
// ou périmée ne doit jamais atteindre la requête, elle retombe sur le défaut.
describe('filtres de la vue de traitement', () => {
	const parse = (query: string) => parseReviewFilters(new URLSearchParams(query));

	it('ouvre sur les demandes en attente, sans autre filtre', () => {
		expect(parse('')).toEqual({ status: 'pending', requesterId: null, from: null, to: null });
	});

	it('ignore un statut ou une date illisible', () => {
		expect(parse('status=bidon&from=hier&to=2026-13-01')).toEqual({
			status: 'pending',
			requesterId: null,
			from: null,
			to: null
		});
	});

	it('lève le filtre de statut sur « toutes » et garde une borne seule', () => {
		expect(parse('status=all&from=2026-11-01')).toEqual({
			status: null,
			requesterId: null,
			from: '2026-11-01',
			to: null
		});
	});

	it("ne garde qu'un identifiant de membre bien formé", () => {
		expect(parse('requester=not-a-uuid').requesterId).toBeNull();
		expect(parse('requester=00000000-0000-0000-0000-0000000000a1').requesterId).toBe(
			'00000000-0000-0000-0000-0000000000a1'
		);
	});

	it('garde les statuts connus', () => {
		expect(parse('status=refused').status).toBe('refused');
		expect(parse('status=approved').status).toBe('approved');
	});
});

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
