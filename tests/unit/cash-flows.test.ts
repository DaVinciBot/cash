import { describe, expect, it } from 'vitest';

import {
	CLOSED_FISCAL_YEAR_MESSAGE,
	fiscalYearProblem,
	periodFor,
	type PeriodRange
} from '#lib/periods.js';
import { cashErrorMessage, isOrderFinalized } from '#lib/types/domain.js';
import { actions } from '../../src/routes/treasury/flows/+page.server';

const FISCAL: PeriodRange[] = [
	{ id: 2, label: 'FY 2027', startsOn: '2027-01-01', endsOn: '2027-12-31', closedAt: null },
	{ id: 1, label: 'FY 2026', startsOn: '2026-01-01', endsOn: '2026-12-31', closedAt: '2027-01-15' }
];

describe('rattachement à un exercice (#77)', () => {
	it("retrouve l'exercice qui couvre une date, bornes comprises", () => {
		expect(periodFor('2027-01-01', FISCAL)?.label).toBe('FY 2027');
		expect(periodFor('2026-12-31', FISCAL)?.label).toBe('FY 2026');
		expect(periodFor('2025-06-01', FISCAL)).toBeNull();
	});

	it("refuse une date d'exercice clos, avec le message attendu", () => {
		expect(fiscalYearProblem('2026-05-04', FISCAL)).toBe(CLOSED_FISCAL_YEAR_MESSAGE);
		expect(fiscalYearProblem('2027-05-04', FISCAL)).toBeNull();
		expect(fiscalYearProblem('2030-05-04', FISCAL)).toMatch(/Aucun exercice/);
	});
});

describe('commande finalisée (#94)', () => {
	it("ne considère finalisée qu'une commande reçue ou annulée", () => {
		expect(isOrderFinalized('completed')).toBe(true);
		expect(isOrderFinalized('canceled')).toBe(true);
		expect(isOrderFinalized('pending_treso')).toBe(false);
		expect(isOrderFinalized('pending_delivery')).toBe(false);
	});

	it('traduit chaque refus de la base', () => {
		for (const code of ['DVB41', 'DVB42', 'DVB43', 'DVB44', 'DVB45']) {
			expect(cashErrorMessage(code, 'défaut')).not.toBe('défaut');
		}
	});
});

// --- Actions ---------------------------------------------------------------

interface Write {
	table: string;
	op: 'insert' | 'update' | 'delete';
	payload?: unknown;
}

interface Fixture {
	/** Résultat de `maybeSingle()` par table. */
	one?: Record<string, unknown>;
	/** Résultat d'une lecture de liste par table. */
	rows?: Record<string, unknown[]>;
	/** Résultat d'un `select(…, { head: true, count })` par table. */
	counts?: Record<string, number>;
}

/** Client supabase chaînable réduit à ce que les actions empruntent. */
function fakeSupabase(fixture: Fixture) {
	const writes: Write[] = [];
	const builder = (table: string) => {
		let op: Write['op'] | 'select' = 'select';
		let head = false;
		const chain = {
			select: (_columns?: string, options?: { head?: boolean }) => {
				head = options?.head === true;
				return chain;
			},
			insert: (payload: unknown) => {
				op = 'insert';
				writes.push({ table, op, payload });
				return chain;
			},
			update: (payload: unknown) => {
				op = 'update';
				writes.push({ table, op, payload });
				return chain;
			},
			delete: () => {
				op = 'delete';
				writes.push({ table, op });
				return chain;
			},
			eq: () => chain,
			in: () => chain,
			is: () => chain,
			gte: () => chain,
			lte: () => chain,
			order: () => chain,
			maybeSingle: () => Promise.resolve({ data: fixture.one?.[table] ?? null }),
			then: (resolve: (value: unknown) => void) => {
				if (op !== 'select') {
					resolve({ error: null });
				} else if (head) {
					resolve({ count: fixture.counts?.[table] ?? 0 });
				} else {
					resolve({ data: fixture.rows?.[table] ?? [] });
				}
			}
		};
		return chain;
	};
	const client = {
		schema: () => ({ from: builder }),
		from: builder,
		storage: { from: () => ({ remove: () => Promise.resolve({}) }) }
	};
	return { client, writes };
}

type Action = (event: never) => Promise<unknown>;

function run(action: unknown, fields: Record<string, string>, client: unknown) {
	const body = new FormData();
	for (const [key, value] of Object.entries(fields)) {
		body.set(key, value);
	}
	const request = new Request('http://localhost/admin/treasury/flows', { method: 'POST', body });
	return (action as Action)({ request, locals: { supabase: client } } as never);
}

const FISCAL_ROWS = FISCAL.map((y) => ({
	id: y.id,
	label: y.label,
	starts_on: y.startsOn,
	ends_on: y.endsOn,
	closed_at: y.closedAt
}));

const manualFlow = { id: 7, direction: 'debit', order_id: null, is_reconciled: false };
const orderFlow = { id: 8, direction: 'debit', order_id: 12, is_reconciled: false };

describe('saisie et suppression', () => {
	it("refuse un mouvement daté d'un exercice clos (#77)", async () => {
		const { client, writes } = fakeSupabase({ rows: { fiscal_years: FISCAL_ROWS } });
		const result = await run(
			actions.create,
			{
				direction: 'debit',
				amount_ttc: '10',
				occurred_on: '2026-06-01',
				label: 'Achat',
				account_id: '1'
			},
			client
		);

		expect(result).toMatchObject({ status: 400, data: { message: CLOSED_FISCAL_YEAR_MESSAGE } });
		expect(writes).toEqual([]);
	});

	it("rattache un mouvement à l'exercice de sa date (#77)", async () => {
		const { client, writes } = fakeSupabase({ rows: { fiscal_years: FISCAL_ROWS } });
		await run(
			actions.create,
			{
				direction: 'credit',
				amount_ttc: '10',
				occurred_on: '2027-03-01',
				label: 'Cotisation',
				account_id: '1'
			},
			client
		);

		expect(writes).toEqual([
			expect.objectContaining({
				table: 'flows',
				op: 'insert',
				payload: expect.objectContaining({ fiscal_year_id: 2 }) as unknown
			})
		]);
	});

	it("n'envoie pas l'exercice d'un flux de commande (#91)", async () => {
		const { client, writes } = fakeSupabase({
			one: { flows: orderFlow },
			rows: { fiscal_years: FISCAL_ROWS }
		});
		await run(
			actions.update,
			{
				id: '8',
				direction: 'debit',
				amount_ttc: '10',
				occurred_on: '2027-03-01',
				label: 'Commande #12',
				account_id: '1'
			},
			client
		);

		const update = writes.find((w) => w.op === 'update');
		expect(update?.payload).not.toHaveProperty('fiscal_year_id');
	});

	it("refuse de supprimer le règlement d'une commande (#70)", async () => {
		const { client, writes } = fakeSupabase({ one: { flows: orderFlow } });
		const result = await run(actions.delete, { id: '8' }, client);

		expect(result).toMatchObject({ status: 409 });
		expect(writes).toEqual([]);
	});
});

describe('pointage', () => {
	it('refuse de pointer une dépense sans justificatif sans dérogation (#72)', async () => {
		const { client, writes } = fakeSupabase({
			one: { flows: manualFlow },
			counts: { flow_proofs: 0 }
		});
		const result = await run(actions.toggleReconciled, { id: '7', reconciled: '1' }, client);

		expect(result).toMatchObject({ status: 409, data: { unproven: 7 } });
		expect(writes).toEqual([]);
	});

	it('pointe une dépense sans justificatif sur dérogation explicite (#72)', async () => {
		const { client, writes } = fakeSupabase({
			one: { flows: manualFlow },
			counts: { flow_proofs: 0 }
		});
		const result = await run(
			actions.toggleReconciled,
			{ id: '7', reconciled: '1', force: '1' },
			client
		);

		expect(result).toEqual({ saved: 'flow' });
		expect(writes).toEqual([{ table: 'flows', op: 'update', payload: { is_reconciled: true } }]);
	});

	it("refuse de pointer le flux d'une commande non finalisée (#94)", async () => {
		const { client, writes } = fakeSupabase({
			one: { flows: orderFlow, orders: { state: 'pending_delivery' } },
			counts: { flow_proofs: 1 }
		});
		const result = await run(actions.toggleReconciled, { id: '8', reconciled: '1' }, client);

		expect(result).toMatchObject({ status: 409 });
		expect(writes).toEqual([]);
	});

	it('dépointe sans condition (#72)', async () => {
		const { client, writes } = fakeSupabase({});
		const result = await run(actions.toggleReconciled, { id: '7', reconciled: '0' }, client);

		expect(result).toEqual({ saved: 'flow' });
		expect(writes).toEqual([{ table: 'flows', op: 'update', payload: { is_reconciled: false } }]);
	});
});
