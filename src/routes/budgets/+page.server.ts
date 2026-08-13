import { currentSchoolYear } from '$lib/server/cash';
import { decimal, text } from '$lib/server/form';
import { budgetTree, overdrawnBudgets, periods } from '$lib/server/treasury';
import { cashErrorMessage } from '@davincibot/lib';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Arbre des budgets (TRESO-F-02/02b/02c/05/06/07) et vue des dépassements (CMD-F-54).
//
// Presque toutes les règles sont tenues par `check_budget_tree` : pas de cycle,
// pas de montant sur un nœud qui a des enfants, pas d'enfant sous un nœud qui
// porte un montant. Ce fichier traduit ses refus (DVB04) et ajoute les deux
// choses que la base ne fait pas : l'archivage en cascade et le refus de
// supprimer un budget qui porte quelque chose.

function budgetId(form: FormData, key = 'id'): number | null {
	const id = Number(form.get(key));
	return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export const load: PageServerLoad = async ({ locals, url, depends }) => {
	depends('cash:budgets');

	const periodRows = await periods(locals.supabase);
	const requested = Number(url.searchParams.get('year'));
	const current = await currentSchoolYear(locals.supabase);
	const schoolYearId =
		Number.isSafeInteger(requested) && requested > 0
			? requested
			: (current?.id ?? periodRows.schoolYears.at(0)?.id ?? null);

	const [tree, overdrawn] = await Promise.all([
		schoolYearId === null ? Promise.resolve([]) : budgetTree(locals.supabase, schoolYearId),
		overdrawnBudgets(locals.supabase)
	]);

	return { tree, overdrawn, schoolYears: periodRows.schoolYears, schoolYearId };
};

export const actions: Actions = {
	/** Création d'un nœud. Un montant n'a de sens que sur une feuille (TRESO-F-02b). */
	create: async ({ locals, request }) => {
		const form = await request.formData();
		const name = text(form, 'name');
		const parentId = budgetId(form, 'parent_id');
		const schoolYearId = budgetId(form, 'school_year_id');
		const rawAmount = text(form, 'amount_ttc');
		const amount = rawAmount === '' ? null : decimal(form, 'amount_ttc');

		if (name.length === 0) {
			return fail(400, { message: 'Le nom du budget est obligatoire.' });
		}
		if (schoolYearId === null) {
			return fail(400, { message: 'Année scolaire invalide.' });
		}
		if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
			return fail(400, { message: 'Le montant doit être positif.' });
		}

		const { error } = await locals.supabase.schema('cash').from('budgets').insert({
			name,
			parent_id: parentId,
			school_year_id: schoolYearId,
			amount_ttc: amount
		});

		if (error) {
			return fail(400, {
				message: cashErrorMessage(error.code, "Ce budget n'a pas pu être créé.")
			});
		}
		return { saved: 'budget' };
	},

	/** Renommage, remontant, et montant — les trois verbes de TRESO-F-05. */
	update: async ({ locals, request }) => {
		const form = await request.formData();
		const id = budgetId(form);
		if (id === null) {
			return fail(400, { message: 'Budget invalide.' });
		}

		const name = text(form, 'name');
		const rawParent = text(form, 'parent_id');
		const rawAmount = text(form, 'amount_ttc');
		const amount = rawAmount === '' ? null : decimal(form, 'amount_ttc');

		if (name.length === 0) {
			return fail(400, { message: 'Le nom du budget est obligatoire.' });
		}
		if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
			return fail(400, { message: 'Le montant doit être positif.' });
		}

		const parentId = rawParent === '' ? null : Number(rawParent);
		if (parentId !== null && !Number.isSafeInteger(parentId)) {
			return fail(400, { message: 'Parent invalide.' });
		}
		if (parentId === id) {
			return fail(400, { message: 'Un budget ne peut pas être son propre parent.' });
		}

		const { error } = await locals.supabase
			.schema('cash')
			.from('budgets')
			.update({ name, parent_id: parentId, amount_ttc: amount })
			.eq('id', id);

		if (error) {
			return fail(400, {
				message: cashErrorMessage(error.code, "Ce budget n'a pas pu être modifié.")
			});
		}
		return { saved: 'budget' };
	},

	/**
	 * Feuille présélectionnée à l'imputation (TRESO-F-02c).
	 *
	 * Le marquage est exclusif dans la fratrie : deux feuilles par défaut sous le
	 * même parent rendraient la présélection arbitraire, ce que l'exigence
	 * refuse expressément.
	 */
	setDefault: async ({ locals, request }) => {
		const form = await request.formData();
		const id = budgetId(form);
		const parentId = budgetId(form, 'parent_id');
		if (id === null) {
			return fail(400, { message: 'Budget invalide.' });
		}

		let siblings = locals.supabase.schema('cash').from('budgets').update({ is_default: false });
		siblings =
			parentId === null ? siblings.is('parent_id', null) : siblings.eq('parent_id', parentId);
		const { error: clearError } = await siblings;
		if (clearError) {
			return fail(400, {
				message: cashErrorMessage(clearError.code, "La feuille par défaut n'a pas pu être changée.")
			});
		}

		const { error } = await locals.supabase
			.schema('cash')
			.from('budgets')
			.update({ is_default: true })
			.eq('id', id);

		if (error) {
			return fail(400, {
				message: cashErrorMessage(error.code, "La feuille par défaut n'a pas pu être changée.")
			});
		}
		return { saved: 'budget' };
	},

	/**
	 * Archivage en cascade (TRESO-F-06).
	 *
	 * Archiver un nœud archive ses descendants : laisser une feuille active sous
	 * un parent archivé la rendrait imputable alors que sa branche ne l'est plus.
	 * La base ne le fait pas — c'est une règle de gestion, pas un invariant de
	 * structure.
	 */
	archive: async ({ locals, request }) => {
		const form = await request.formData();
		const id = budgetId(form);
		if (id === null) {
			return fail(400, { message: 'Budget invalide.' });
		}

		const { data: all } = await locals.supabase
			.schema('cash')
			.from('budgets')
			.select('id, parent_id');

		const targets = new Set([id]);
		// L'arbre tient en quelques dizaines de nœuds : une passe répétée coûte
		// moins qu'une récursive côté base, et se lit d'un coup d'œil.
		let grew = true;
		while (grew) {
			grew = false;
			for (const b of all ?? []) {
				if (b.parent_id !== null && targets.has(b.parent_id) && !targets.has(b.id)) {
					targets.add(b.id);
					grew = true;
				}
			}
		}

		const { error } = await locals.supabase
			.schema('cash')
			.from('budgets')
			.update({ archived_at: new Date().toISOString(), is_default: false })
			.in('id', [...targets]);

		if (error) {
			return fail(400, {
				message: cashErrorMessage(error.code, "Ce budget n'a pas pu être archivé.")
			});
		}
		return { saved: 'budget', archived: targets.size };
	},

	restore: async ({ locals, request }) => {
		const form = await request.formData();
		const id = budgetId(form);
		if (id === null) {
			return fail(400, { message: 'Budget invalide.' });
		}

		const { error } = await locals.supabase
			.schema('cash')
			.from('budgets')
			.update({ archived_at: null })
			.eq('id', id);

		if (error) {
			return fail(400, {
				message: cashErrorMessage(error.code, "Ce budget n'a pas pu être réactivé.")
			});
		}
		return { saved: 'budget' };
	},

	/**
	 * Suppression définitive, réservée aux budgets vides (TRESO-F-06).
	 *
	 * On vérifie ici plutôt que de laisser la clé étrangère parler : le message
	 * de Postgres nommerait une contrainte, pas la raison — et le trésorier a
	 * besoin de savoir que le bon geste est d'archiver.
	 */
	remove: async ({ locals, request }) => {
		const form = await request.formData();
		const id = budgetId(form);
		if (id === null) {
			return fail(400, { message: 'Budget invalide.' });
		}

		const [{ count: children }, { count: allocations }, { count: flows }] = await Promise.all([
			locals.supabase
				.schema('cash')
				.from('budgets')
				.select('id', { count: 'exact', head: true })
				.eq('parent_id', id),
			locals.supabase
				.schema('cash')
				.from('item_budget_allocations')
				.select('item_id', { count: 'exact', head: true })
				.eq('budget_id', id),
			locals.supabase
				.schema('cash')
				.from('flows')
				.select('id', { count: 'exact', head: true })
				.eq('budget_id', id)
		]);

		if ((children ?? 0) > 0) {
			return fail(400, {
				message: 'Ce budget porte des sous-budgets : archivez-le plutôt que de le supprimer.'
			});
		}
		if ((allocations ?? 0) > 0 || (flows ?? 0) > 0) {
			return fail(400, {
				message:
					"Ce budget porte des dépenses : archivez-le, l'historique et les totaux passés doivent rester intacts."
			});
		}

		const { error } = await locals.supabase.schema('cash').from('budgets').delete().eq('id', id);
		if (error) {
			return fail(400, {
				message: cashErrorMessage(error.code, "Ce budget n'a pas pu être supprimé.")
			});
		}
		return { saved: 'budget' };
	}
};
