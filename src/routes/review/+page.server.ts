import { projectsWithPermission, reviewQueue } from '$lib/server/cash';
import { text, textAll } from '$lib/server/form';
import { cashErrorMessage, refusalReasonError } from '@davincibot/lib';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Revue CDP (§10.4). Les deux actions écrivent l'état, jamais le contenu : le
// contrôle de fond est en base — `check_item_transition` exige
// `orders.items.review.project` sur le projet de chaque item et refuse un motif
// vide. Ce qui se joue ici est la qualité du refus (message clair au lieu d'un
// 42501) et le bornage de la sélection à ce que le CDP a réellement le droit de
// revoir, pour qu'une soumission trafiquée échoue sans rien laisser passer.

/** Identifiants d'items lus d'un formulaire, dédoublonnés et validés. */
function selectedIds(form: FormData): number[] {
	const ids = textAll(form, 'id')
		.map(Number)
		.filter((id) => Number.isSafeInteger(id) && id > 0);
	return [...new Set(ids)];
}

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('cash:review');

	const { user } = await locals.safeGetSession();
	if (!user?.id) {
		return { projects: [], items: [] };
	}

	const projects = await projectsWithPermission(
		locals.supabase,
		user.id,
		'orders.items.review.project'
	);

	return { projects, items: await reviewQueue(locals.supabase, projects) };
};

export const actions: Actions = {
	/** Validation unitaire ou en lot : `pending_cdp` → `pending_bundled`. */
	approve: async ({ locals, request }) => {
		const { user } = await locals.safeGetSession();
		if (!user?.id) {
			error(401, 'Session expirée.');
		}

		const form = await request.formData();
		const ids = selectedIds(form);
		if (ids.length === 0) {
			return fail(400, { message: 'Aucun item sélectionné.' });
		}

		// Le filtre sur l'état courant n'est pas une redite de la garde en base :
		// il rend l'opération sûre en lot. Sans lui, un item validé entre-temps
		// par un co-CDP ferait échouer la transition et emporterait toute la
		// sélection avec elle, la mise à jour étant une seule transaction.
		const { data, error: updateError } = await locals.supabase
			.schema('cash')
			.from('items')
			.update({ state: 'pending_bundled' })
			.in('id', ids)
			.eq('state', 'pending_cdp')
			.select('id');

		if (updateError) {
			return fail(400, {
				message: cashErrorMessage(updateError.code, "Ces items n'ont pas pu être validés.")
			});
		}

		return { approved: data.length, ignored: ids.length - data.length };
	},

	/**
	 * Refus unitaire ou en lot avec un motif unique.
	 *
	 * Un motif partagé est ce que produit la décision réelle — « hors budget ce
	 * trimestre » vaut pour les dix lignes d'un coup. C'est aussi le mécanisme
	 * que J5 reprendra tel quel pour `refused_treso` (CMD-F-29).
	 */
	refuse: async ({ locals, request }) => {
		const { user } = await locals.safeGetSession();
		if (!user?.id) {
			error(401, 'Session expirée.');
		}

		const form = await request.formData();
		const ids = selectedIds(form);
		if (ids.length === 0) {
			return fail(400, { message: 'Aucun item sélectionné.' });
		}

		const reason = text(form, 'reason');
		const reasonError = refusalReasonError(reason);
		if (reasonError) {
			return fail(400, { message: reasonError, reason, refusing: ids });
		}

		const { data, error: updateError } = await locals.supabase
			.schema('cash')
			.from('items')
			.update({ state: 'refused_cdp', refused_reason: reason })
			.in('id', ids)
			.eq('state', 'pending_cdp')
			.select('id');

		if (updateError) {
			return fail(400, {
				message: cashErrorMessage(updateError.code, "Ces items n'ont pas pu être refusés."),
				reason,
				refusing: ids
			});
		}

		return { refused: data.length, ignored: ids.length - data.length };
	}
};
