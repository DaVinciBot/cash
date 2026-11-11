import { fiscalYearProblem, periodFor } from '#lib/periods.js';
import { rejection } from '#lib/server/audit.js';
import { currentSchoolYear } from '#lib/server/cash.js';
import { decimal, text } from '#lib/server/form.js';
import { budgetLeaves } from '#lib/server/orders.js';
import { accounts, flowList, periods } from '#lib/server/treasury.js';
import { FLOW_DIRECTIONS, isOrderFinalized, type FlowDirection } from '#lib/types/domain.js';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Dépenses et recettes (TRESO-F-20), avec leurs justificatifs (TRESO-F-30/31).
//
// Un flux `auto` naît du passage d'une commande. Tant qu'il n'est pas POINTÉ il
// se recale seul sur le total de sa commande ; il ne se supprime pas d'ici, la
// commande s'annule.
//
// Règles de rigueur comptable, portées par la base et rendues lisibles ici :
//   - l'exercice d'un flux se déduit de sa date, et une date d'exercice clos est
//     refusée (DVB41) ; celui d'un flux de commande est hérité de la commande ;
//   - un flux pointé est figé, justificatifs compris, jusqu'à son dépointage (DVB42) ;
//   - un flux de commande ne se pointe qu'une fois la commande finalisée (DVB43).
// Seule l'exigence d'un justificatif pour pointer une dépense est une règle
// d'écran : elle admet une dérogation explicite, cochée par le trésorier.

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const PROOF_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];
const PROOF_MAX_BYTES = 5 * 1024 * 1024;

/** Découpage de la liste : exercice fiscal, ou année scolaire de septembre à août (#69). */
type FlowView = 'fiscal' | 'school';

function flowId(form: FormData): number | null {
	const id = Number(form.get('id'));
	return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export const load: PageServerLoad = async ({ locals, url, depends }) => {
	depends('cash:flows');

	const periodRows = await periods(locals.supabase);
	const view: FlowView = url.searchParams.get('view') === 'school' ? 'school' : 'fiscal';
	const requested = Number(url.searchParams.get('year'));
	// Par défaut, la période qui COUVRE aujourd'hui — et non la première période
	// ouverte. Les périodes sont listées de la plus récente à la plus ancienne,
	// et la suivante est ouverte bien avant d'avoir le moindre mouvement : s'y
	// poser d'office donnerait une page vide pour toute réponse.
	const today = new Date().toISOString().slice(0, 10);
	const candidates = view === 'school' ? periodRows.schoolYears : periodRows.fiscalYears;
	const current =
		periodFor(today, candidates) ?? candidates.find((period) => !period.closedAt) ?? null;
	const selected =
		(Number.isSafeInteger(requested) && requested > 0
			? candidates.find((period) => period.id === requested)
			: null) ?? current;

	// Une année scolaire chevauche deux exercices : elle se filtre par dates.
	const scope =
		selected === null
			? null
			: view === 'school'
				? { from: selected.startsOn, to: selected.endsOn }
				: selected.id;

	const year = await currentSchoolYear(locals.supabase);
	const [flows, accountRows, leaves] = await Promise.all([
		flowList(locals.supabase, scope),
		accounts(locals.supabase),
		year
			? budgetLeaves(locals.supabase, year.id).then((r) => r.leaves)
			: Promise.resolve([] as Awaited<ReturnType<typeof budgetLeaves>>['leaves'])
	]);

	return {
		flows,
		accounts: accountRows,
		leaves,
		periods: periodRows,
		view,
		periodId: selected?.id ?? null,
		// Conservé pour les écrans qui lisent encore l'exercice sélectionné.
		fiscalYearId: view === 'fiscal' ? (selected?.id ?? null) : null
	};
};

/** Champs communs à la création et à la modification d'un flux. */
function readFlow(form: FormData) {
	const direction = text(form, 'direction');
	const amount = decimal(form, 'amount_ttc');
	const occurredOn = text(form, 'occurred_on');
	const label = text(form, 'label');
	const accountId = Number(form.get('account_id'));
	const rawBudget = text(form, 'budget_id');
	const budgetId = rawBudget === '' ? null : Number(rawBudget);

	if (!FLOW_DIRECTIONS.includes(direction as FlowDirection)) {
		return { error: 'Sens du mouvement inconnu.' as const };
	}
	if (!Number.isFinite(amount) || amount <= 0) {
		return { error: 'Le montant doit être strictement positif.' as const };
	}
	if (!ISO_DAY.test(occurredOn)) {
		return { error: 'La date du mouvement est obligatoire.' as const };
	}
	if (label.length === 0) {
		return { error: 'Le libellé est obligatoire.' as const };
	}
	if (!Number.isSafeInteger(accountId)) {
		return { error: 'Compte invalide.' as const };
	}
	if (budgetId !== null && !Number.isSafeInteger(budgetId)) {
		return { error: 'Budget invalide.' as const };
	}

	return {
		values: {
			direction: direction as FlowDirection,
			amount_ttc: Math.round(amount * 100) / 100,
			occurred_on: occurredOn,
			label,
			account_id: accountId,
			budget_id: budgetId
		}
	};
}

/** Ce qu'il faut savoir d'un flux avant d'y toucher. */
async function flowState(supabase: App.Locals['supabase'], id: number) {
	const { data } = await supabase
		.schema('cash')
		.from('flows')
		.select('id, direction, order_id, is_reconciled, fiscal_year_id')
		.eq('id', id)
		.maybeSingle();
	return data;
}

export const actions: Actions = {
	create: async ({ locals, request }) => {
		const form = await request.formData();
		const parsed = readFlow(form);
		if ('error' in parsed) {
			return fail(400, { message: parsed.error });
		}

		// L'exercice se déduit de la date (#77) : la base le recalcule de toute
		// façon, on le calcule ici pour refuser une date d'exercice clos avec un
		// message clair plutôt qu'un code.
		const { fiscalYears } = await periods(locals.supabase);
		const problem = fiscalYearProblem(parsed.values.occurred_on, fiscalYears);
		const fiscalYear = periodFor(parsed.values.occurred_on, fiscalYears);
		if (problem || !fiscalYear) {
			return fail(400, { message: problem ?? 'Exercice introuvable.' });
		}

		const { error } = await locals.supabase
			.schema('cash')
			.from('flows')
			.insert({ ...parsed.values, fiscal_year_id: fiscalYear.id, origin: 'manual' });

		if (error) {
			return fail(400, {
				message: await rejection(
					locals.supabase,
					error,
					"Ce mouvement n'a pas pu être enregistré.",
					{
						entityType: 'flow'
					}
				)
			});
		}
		return { saved: 'flow' };
	},

	update: async ({ locals, request }) => {
		const form = await request.formData();
		const id = flowId(form);
		if (id === null) {
			return fail(400, { message: 'Mouvement invalide.' });
		}
		const parsed = readFlow(form);
		if ('error' in parsed) {
			return fail(400, { message: parsed.error });
		}

		const flow = await flowState(locals.supabase, id);
		if (!flow) {
			return fail(404, { message: 'Mouvement introuvable.' });
		}
		if (flow.is_reconciled) {
			return fail(409, {
				message: 'Ce mouvement est pointé : dépointez-le avant de le modifier.'
			});
		}

		// Un flux de commande garde l'exercice de sa commande (#91) : on ne
		// l'envoie pas, et la base le fige de toute façon. Les autres suivent leur date.
		let fiscalYearId: number | undefined;
		if (flow.order_id === null) {
			const { fiscalYears } = await periods(locals.supabase);
			const problem = fiscalYearProblem(parsed.values.occurred_on, fiscalYears);
			const fiscalYear = periodFor(parsed.values.occurred_on, fiscalYears);
			if (problem || !fiscalYear) {
				return fail(400, { message: problem ?? 'Exercice introuvable.' });
			}
			fiscalYearId = fiscalYear.id;
		}

		const { error } = await locals.supabase
			.schema('cash')
			.from('flows')
			.update(
				fiscalYearId === undefined
					? parsed.values
					: { ...parsed.values, fiscal_year_id: fiscalYearId }
			)
			.eq('id', id);

		if (error) {
			return fail(400, {
				message: await rejection(locals.supabase, error, "Ce mouvement n'a pas pu être modifié.", {
					entityType: 'flow'
				})
			});
		}
		return { saved: 'flow' };
	},

	delete: async ({ locals, request }) => {
		const form = await request.formData();
		const id = flowId(form);
		if (id === null) {
			return fail(400, { message: 'Mouvement invalide.' });
		}

		const flow = await flowState(locals.supabase, id);
		if (!flow) {
			return fail(404, { message: 'Mouvement introuvable.' });
		}
		// #70 — le règlement d'une commande ne se supprime pas d'ici : sa somme
		// doit rester égale au dû (`flows_guard`). C'est la commande qui s'annule.
		if (flow.order_id !== null) {
			return fail(409, {
				message: 'Ce mouvement règle une commande : annulez la commande plutôt que de le supprimer.'
			});
		}
		if (flow.is_reconciled) {
			return fail(409, {
				message: 'Ce mouvement est pointé : dépointez-le avant de le supprimer.'
			});
		}

		// Les justificatifs partent avec le flux : un fichier orphelin dans le
		// bucket n'est plus rattachable à rien et ne se retrouverait jamais.
		const { data: proofs } = await locals.supabase
			.schema('cash')
			.from('flow_proofs')
			.select('storage_path')
			.eq('flow_id', id);

		const { error } = await locals.supabase.schema('cash').from('flows').delete().eq('id', id);
		if (error) {
			return fail(400, {
				message: await rejection(locals.supabase, error, "Ce mouvement n'a pas pu être supprimé.", {
					entityType: 'flow'
				})
			});
		}

		const paths = (proofs ?? []).map((p) => p.storage_path);
		if (paths.length > 0) {
			await locals.supabase.storage.from('proof').remove(paths);
		}
		return { saved: 'flow' };
	},

	/**
	 * Pointage d'un flux, et dépointage.
	 *
	 * Sur un flux issu d'une commande, c'est aussi ce qui le fige : `sync_order_flows`
	 * ne recale plus un flux pointé. Il faut donc que la commande soit finalisée
	 * (#94). Une dépense sans justificatif ne se pointe que sur dérogation
	 * explicite (`force`, #72).
	 */
	toggleReconciled: async ({ locals, request }) => {
		const form = await request.formData();
		const id = flowId(form);
		if (id === null) {
			return fail(400, { message: 'Mouvement invalide.' });
		}
		const reconcile = text(form, 'reconciled') === '1';

		if (reconcile) {
			const flow = await flowState(locals.supabase, id);
			if (!flow) {
				return fail(404, { message: 'Mouvement introuvable.' });
			}
			if (flow.order_id !== null) {
				const { data: order } = await locals.supabase
					.schema('cash')
					.from('orders')
					.select('state')
					.eq('id', flow.order_id)
					.maybeSingle();
				if (order && !isOrderFinalized(order.state)) {
					return fail(409, {
						message: "Impossible de pointer : la commande doit d'abord être finalisée."
					});
				}
			}
			if (flow.direction === 'debit' && text(form, 'force') !== '1') {
				const { count } = await locals.supabase
					.schema('cash')
					.from('flow_proofs')
					.select('id', { count: 'exact', head: true })
					.eq('flow_id', id);
				if (!count) {
					return fail(409, {
						message:
							"Cette dépense n'a aucun justificatif : déposez-en un, ou cochez « Forcer le pointage sans justificatif ».",
						unproven: id
					});
				}
			}
		}

		const { error } = await locals.supabase
			.schema('cash')
			.from('flows')
			.update({ is_reconciled: reconcile })
			.eq('id', id);

		if (error) {
			return fail(400, {
				message: await rejection(
					locals.supabase,
					error,
					reconcile
						? "Ce mouvement n'a pas pu être pointé."
						: "Ce mouvement n'a pas pu être dépointé.",
					{
						entityType: 'flow'
					}
				)
			});
		}
		return { saved: 'flow' };
	},

	/** Dépôt d'un justificatif (TRESO-F-30). Le bucket `proof` reste privé. */
	addProof: async ({ locals, request }) => {
		const form = await request.formData();
		const id = flowId(form);
		const file = form.get('file');

		if (id === null) {
			return fail(400, { message: 'Mouvement invalide.' });
		}
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { message: 'Aucun fichier reçu.' });
		}
		if (!PROOF_TYPES.includes(file.type)) {
			return fail(400, { message: 'Seuls les PNG, JPEG et PDF sont acceptés.' });
		}
		if (file.size > PROOF_MAX_BYTES) {
			return fail(400, { message: 'Le fichier dépasse 5 Mo.' });
		}

		// Vérifié avant le dépôt : un fichier envoyé pour rien resterait dans le
		// bucket le temps qu'on le retire.
		const flow = await flowState(locals.supabase, id);
		if (flow?.is_reconciled) {
			return fail(409, {
				message: 'Ce mouvement est pointé : dépointez-le avant de toucher à ses justificatifs.'
			});
		}

		// Nom aléatoire : deux justificatifs peuvent porter le même nom d'origine,
		// et un nom de fichier saisi par un tiers n'a rien à faire dans un chemin.
		const extension = file.type === 'application/pdf' ? 'pdf' : file.type.split('/').at(1);
		const path = `flows/${String(id)}/${crypto.randomUUID()}.${extension ?? 'bin'}`;

		const { error: uploadError } = await locals.supabase.storage
			.from('proof')
			.upload(path, file, { contentType: file.type });

		if (uploadError) {
			return fail(400, { message: "Ce justificatif n'a pas pu être déposé." });
		}

		const { error } = await locals.supabase
			.schema('cash')
			.from('flow_proofs')
			.insert({ flow_id: id, storage_path: path, mime_type: file.type });

		if (error) {
			// Le fichier est déjà là ; sans sa ligne il serait invisible et
			// impossible à retrouver, donc on le retire.
			await locals.supabase.storage.from('proof').remove([path]);
			return fail(400, {
				message: await rejection(
					locals.supabase,
					error,
					"Ce justificatif n'a pas pu être rattaché.",
					{
						entityType: 'flow'
					}
				)
			});
		}
		return { saved: 'proof' };
	},

	removeProof: async ({ locals, request }) => {
		const form = await request.formData();
		const id = Number(form.get('proof'));
		if (!Number.isSafeInteger(id)) {
			return fail(400, { message: 'Justificatif invalide.' });
		}

		const { data: proof } = await locals.supabase
			.schema('cash')
			.from('flow_proofs')
			.select('storage_path')
			.eq('id', id)
			.maybeSingle();

		const { error } = await locals.supabase
			.schema('cash')
			.from('flow_proofs')
			.delete()
			.eq('id', id);

		if (error) {
			return fail(400, {
				message: await rejection(
					locals.supabase,
					error,
					"Ce justificatif n'a pas pu être supprimé.",
					{
						entityType: 'flow'
					}
				)
			});
		}
		if (proof) {
			await locals.supabase.storage.from('proof').remove([proof.storage_path]);
		}
		return { saved: 'proof' };
	}
};
