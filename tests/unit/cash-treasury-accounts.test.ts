import { describe, expect, it, vi } from 'vitest';

import { cashErrorMessage, TREASURY_ACCOUNT_KINDS } from '#lib/types/domain.js';
import { actions } from '../../src/routes/treasury/+page.server';

/**
 * Une enveloppe partenaire naît et s'archive avec son partenariat : la
 * trésorerie ne la crée pas et ne l'archive pas. Le dernier compte courant
 * ouvert, lui, est protégé en base (DVB40).
 */

type Action = (event: never) => Promise<unknown>;

function request(fields: Record<string, string>) {
	const body = new FormData();
	for (const [key, value] of Object.entries(fields)) {
		body.set(key, value);
	}
	return new Request('http://localhost/admin/treasury', { method: 'POST', body });
}

/** Client supabase réduit aux chaînes qu'emprunte l'action, chacune espionnée. */
function supabase(account: { kind: string } | null) {
	const insert = vi.fn(() => Promise.resolve({ error: null }));
	const update = vi.fn(() => ({ eq: () => Promise.resolve({ error: null }) }));
	const client = {
		schema: () => ({
			from: () => ({
				insert,
				update,
				select: () => ({
					eq: () => ({ maybeSingle: () => Promise.resolve({ data: account }) })
				})
			})
		})
	};
	return { client, insert, update };
}

const run = (action: Action, fields: Record<string, string>, client: unknown) =>
	action({ request: request(fields), locals: { supabase: client } } as never);

describe('comptes ouverts depuis la trésorerie', () => {
	it("ne propose pas l'enveloppe partenaire", () => {
		expect(TREASURY_ACCOUNT_KINDS).toEqual(['current', 'savings']);
	});

	it('refuse de créer une enveloppe partenaire', async () => {
		const { client, insert } = supabase(null);
		const result = await run(
			actions.createAccount as Action,
			{ name: 'Enveloppe X', kind: 'partner_credit', opening_balance: '0' },
			client
		);

		expect(result).toMatchObject({ status: 400 });
		expect(insert).not.toHaveBeenCalled();
	});

	it('crée un compte courant ou un livret', async () => {
		const { client, insert } = supabase(null);
		const result = await run(
			actions.createAccount as Action,
			{ name: 'Livret A', kind: 'savings', opening_balance: '10,50' },
			client
		);

		expect(result).toEqual({ saved: 'account' });
		expect(insert).toHaveBeenCalledWith({
			name: 'Livret A',
			kind: 'savings',
			opening_balance: 10.5
		});
	});
});

describe('archivage depuis la trésorerie', () => {
	it("refuse d'archiver une enveloppe partenaire", async () => {
		const { client, update } = supabase({ kind: 'partner_credit' });
		const result = await run(
			actions.toggleArchiveAccount as Action,
			{ id: '3', archive: '1' },
			client
		);

		expect(result).toMatchObject({ status: 400 });
		expect(update).not.toHaveBeenCalled();
	});

	it('archive un livret', async () => {
		const { client, update } = supabase({ kind: 'savings' });
		const result = await run(
			actions.toggleArchiveAccount as Action,
			{ id: '2', archive: '1' },
			client
		);

		expect(result).toEqual({ saved: 'account' });
		expect(update).toHaveBeenCalledOnce();
	});

	it('explique le refus du dernier compte courant', () => {
		expect(cashErrorMessage('DVB40', 'défaut')).toMatch(/dernier compte courant/);
	});
});
