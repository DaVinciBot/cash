import { resolve } from '$app/paths';
import { currentSchoolYear } from '$lib/server/cash';
import { text, textAll } from '$lib/server/form';
import { budgetLeaves, bundlingQueue, defaultLeafFor } from '$lib/server/orders';
import { cashErrorMessage, refusalReasonError } from '@davincibot/lib';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// File de regroupement (CMD-F-10/11/80) et veto du trésorier (CMD-F-29).

function selectedIds(form: FormData): number[] {
	const ids = textAll(form, 'id')
		.map(Number)
		.filter((id) => Number.isSafeInteger(id) && id > 0);
	return [...new Set(ids)];
}

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('cash:bundle');

	const items = await bundlingQueue(locals.supabase);
	const year = await currentSchoolYear(locals.supabase);

	return { items, schoolYearLabel: year?.label ?? null };
};

export const actions: Actions = {
	/**
	 * Constitution d'une commande à partir de la sélection.
	 *
	 * L'ordre des écritures suit les contraintes de la base : la commande
	 * d'abord, puis le rattachement des items — `item_order_link` interdit un
	 * item `bundled` sans commande —, puis l'imputation par défaut.
	 */
	create: async ({ locals, request }) => {
		const { user } = await locals.safeGetSession();
		if (!user?.id) {
			error(401, 'Session expirée.');
		}

		const form = await request.formData();
		const ids = selectedIds(form);
		if (ids.length === 0) {
			return fail(400, { message: 'Aucun item sélectionné.' });
		}

		const { data: chosen, error: readError } = await locals.supabase
			.schema('cash')
			.from('items')
			.select('id, campus, school_year_id, project_id, total_ttc')
			.in('id', ids)
			.eq('state', 'pending_bundled')
			.is('order_id', null);

		if (readError || chosen.length === 0) {
			return fail(400, { message: 'Ces items ne sont plus disponibles au regroupement.' });
		}

		// Les deux invariants sont tenus par des triggers, mais un DVB01 tombé au
		// milieu d'une commande déjà créée laisserait une coquille vide derrière
		// lui : on préfère refuser avant d'écrire quoi que ce soit.
		const campuses = new Set(chosen.map((i) => i.campus));
		if (campuses.size > 1) {
			return fail(400, {
				message:
					'Une commande n’a qu’une destination : ces items relèvent de deux campus différents (CMD-F-45).'
			});
		}
		const years = new Set(chosen.map((i) => i.school_year_id));
		if (years.size > 1) {
			return fail(400, {
				message: 'Ces items relèvent de deux années scolaires différentes.'
			});
		}

		const schoolYearId = chosen[0]?.school_year_id;
		if (schoolYearId === undefined) {
			return fail(400, { message: 'Ces items ne sont plus disponibles au regroupement.' });
		}

		const { data: order, error: createError } = await locals.supabase
			.schema('cash')
			.from('orders')
			.insert({ school_year_id: schoolYearId })
			.select('id')
			.single();

		if (createError) {
			return fail(400, {
				message: cashErrorMessage(createError.code, 'La commande n’a pas pu être créée.')
			});
		}

		const { error: attachError } = await locals.supabase
			.schema('cash')
			.from('items')
			.update({ order_id: order.id, state: 'bundled' })
			.in(
				'id',
				chosen.map((i) => i.id)
			)
			.eq('state', 'pending_bundled');

		if (attachError) {
			// La commande vide n'a plus de raison d'être ; sa suppression est sans
			// effet de bord, aucun item ne la référence.
			await locals.supabase.schema('cash').from('orders').delete().eq('id', order.id);
			return fail(400, {
				message: cashErrorMessage(attachError.code, 'Ces items n’ont pas pu être regroupés.')
			});
		}

		// Imputation par défaut (CMD-F-18). Une feuille introuvable n'est pas une
		// erreur : `check_order_imputation` empêchera le passage tant que le
		// trésorier n'aura pas tranché lui-même.
		const { nodes, leaves } = await budgetLeaves(locals.supabase, schoolYearId);
		const leafIds = new Set(leaves.map((l) => l.id));
		const { data: projects } = await locals.supabase
			.from('projects')
			.select('id, budget_id')
			.in('id', [...new Set(chosen.map((i) => i.project_id))]);
		const budgetOfProject = new Map((projects ?? []).map((p) => [p.id, p.budget_id]));

		for (const item of chosen) {
			const leaf = defaultLeafFor(nodes, leafIds, budgetOfProject.get(item.project_id) ?? null);
			if (leaf === null) {
				continue;
			}
			await locals.supabase.schema('cash').rpc('set_item_allocations', {
				p_item_id: item.id,
				p_budget_ids: [leaf],
				p_amounts: [item.total_ttc ?? 0]
			});
		}

		// `resolve` et non un chemin nu : l'app est servie sous /admin, et un
		// Location sans ce préfixe enverrait le navigateur sur le site public.
		redirect(303, resolve('/orders/[id]', { id: String(order.id) }));
	},

	/** Veto du trésorier depuis la file des items validés (CMD-F-29). */
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
			return fail(400, { message: reasonError });
		}

		const { data, error: updateError } = await locals.supabase
			.schema('cash')
			.from('items')
			.update({ state: 'refused_treso', refused_reason: reason })
			.in('id', ids)
			.eq('state', 'pending_bundled')
			.is('order_id', null)
			.select('id');

		if (updateError) {
			return fail(400, {
				message: cashErrorMessage(updateError.code, 'Ces items n’ont pas pu être refusés.')
			});
		}

		return { refused: data.length, ignored: ids.length - data.length };
	}
};
