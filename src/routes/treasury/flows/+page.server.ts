import { currentSchoolYear } from '$lib/server/cash';
import { decimal, text } from '$lib/server/form';
import { budgetLeaves } from '$lib/server/orders';
import { accounts, flowList, periods } from '$lib/server/treasury';
import { cashErrorMessage, FLOW_DIRECTIONS, type FlowDirection } from '@davincibot/lib';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Dépenses et recettes (TRESO-F-20), avec leurs justificatifs (TRESO-F-30/31).
//
// Un flux `auto` naît du passage d'une commande : il reste modifiable et
// supprimable (TRESO-F-23), mais tant qu'il n'est pas POINTÉ il se recale seul
// sur le total de sa commande. Le pointer, c'est en prendre la responsabilité —
// et c'est ce que l'écran dit.

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const PROOF_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];
const PROOF_MAX_BYTES = 5 * 1024 * 1024;

function flowId(form: FormData): number | null {
	const id = Number(form.get('id'));
	return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export const load: PageServerLoad = async ({ locals, url, depends }) => {
	depends('cash:flows');

	const periodRows = await periods(locals.supabase);
	const requested = Number(url.searchParams.get('year'));
	// Par défaut, l'exercice qui COUVRE aujourd'hui — et non le premier exercice
	// ouvert. Les exercices sont listés du plus récent au plus ancien, et 2027
	// est ouvert bien avant d'avoir le moindre mouvement : s'y poser d'office
	// donnerait une page vide pour toute réponse.
	const today = new Date().toISOString().slice(0, 10);
	const current =
		periodRows.fiscalYears.find((y) => y.startsOn <= today && today <= y.endsOn) ??
		periodRows.fiscalYears.find((y) => !y.closedAt);
	const fiscalYearId =
		Number.isSafeInteger(requested) && requested > 0 ? requested : (current?.id ?? null);

	const year = await currentSchoolYear(locals.supabase);
	const [flows, accountRows, leaves] = await Promise.all([
		flowList(locals.supabase, fiscalYearId),
		accounts(locals.supabase),
		year
			? budgetLeaves(locals.supabase, year.id).then((r) => r.leaves)
			: Promise.resolve([] as Awaited<ReturnType<typeof budgetLeaves>>['leaves'])
	]);

	return { flows, accounts: accountRows, leaves, periods: periodRows, fiscalYearId };
};

/** Champs communs à la création et à la modification d'un flux. */
function readFlow(form: FormData) {
	const direction = text(form, 'direction');
	const amount = decimal(form, 'amount_ttc');
	const occurredOn = text(form, 'occurred_on');
	const label = text(form, 'label');
	const accountId = Number(form.get('account_id'));
	const fiscalYearId = Number(form.get('fiscal_year_id'));
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
	if (!Number.isSafeInteger(accountId) || !Number.isSafeInteger(fiscalYearId)) {
		return { error: 'Compte ou exercice invalide.' as const };
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
			fiscal_year_id: fiscalYearId,
			budget_id: budgetId
		}
	};
}

export const actions: Actions = {
	create: async ({ locals, request }) => {
		const form = await request.formData();
		const parsed = readFlow(form);
		if ('error' in parsed) {
			return fail(400, { message: parsed.error });
		}

		const { error } = await locals.supabase
			.schema('cash')
			.from('flows')
			.insert({ ...parsed.values, origin: 'manual' });

		if (error) {
			return fail(400, {
				message: cashErrorMessage(error.code, 'Ce mouvement n’a pas pu être enregistré.')
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

		const { error } = await locals.supabase
			.schema('cash')
			.from('flows')
			.update(parsed.values)
			.eq('id', id);

		if (error) {
			return fail(400, {
				message: cashErrorMessage(error.code, 'Ce mouvement n’a pas pu être modifié.')
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
				message: cashErrorMessage(error.code, 'Ce mouvement n’a pas pu être supprimé.')
			});
		}

		const paths = (proofs ?? []).map((p) => p.storage_path);
		if (paths.length > 0) {
			await locals.supabase.storage.from('proof').remove(paths);
		}
		return { saved: 'flow' };
	},

	/**
	 * Pointage d'un flux.
	 *
	 * Sur un flux issu d'une commande, c'est aussi ce qui le fige : `sync_order_flows`
	 * ne recale plus un flux pointé. Le trésorier prend donc la responsabilité du
	 * montant en confirmant qu'il l'a confronté au réel.
	 */
	toggleReconciled: async ({ locals, request }) => {
		const form = await request.formData();
		const id = flowId(form);
		if (id === null) {
			return fail(400, { message: 'Mouvement invalide.' });
		}

		const { error } = await locals.supabase
			.schema('cash')
			.from('flows')
			.update({ is_reconciled: text(form, 'reconciled') === '1' })
			.eq('id', id);

		if (error) {
			return fail(400, {
				message: cashErrorMessage(error.code, 'Ce mouvement n’a pas pu être pointé.')
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

		// Nom aléatoire : deux justificatifs peuvent porter le même nom d'origine,
		// et un nom de fichier saisi par un tiers n'a rien à faire dans un chemin.
		const extension = file.type === 'application/pdf' ? 'pdf' : file.type.split('/').at(1);
		const path = `flows/${String(id)}/${crypto.randomUUID()}.${extension ?? 'bin'}`;

		const { error: uploadError } = await locals.supabase.storage
			.from('proof')
			.upload(path, file, { contentType: file.type });

		if (uploadError) {
			return fail(400, { message: 'Ce justificatif n’a pas pu être déposé.' });
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
				message: cashErrorMessage(error.code, 'Ce justificatif n’a pas pu être rattaché.')
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
				message: cashErrorMessage(error.code, 'Ce justificatif n’a pas pu être supprimé.')
			});
		}
		if (proof) {
			await locals.supabase.storage.from('proof').remove([proof.storage_path]);
		}
		return { saved: 'proof' };
	}
};
