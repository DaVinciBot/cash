import { rejection } from '#lib/server/audit.js';
import { currentSchoolYear } from '#lib/server/cash.js';
import { text, textAll } from '#lib/server/form.js';
import { allocateDefaultLeaves, bundlingQueue, draftOrders } from '#lib/server/orders.js';
import { refusalReasonError } from '#lib/types/domain.js';
import { resolve } from '$app/paths';
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

	const [items, upcoming, year, drafts] = await Promise.all([
		bundlingQueue(locals.supabase),
		// #62 — ce que les CDP n'ont pas encore validé : les décaissements à venir.
		bundlingQueue(locals.supabase, 'pending_cdp'),
		currentSchoolYear(locals.supabase),
		draftOrders(locals.supabase)
	]);

	return {
		items,
		upcoming,
		drafts,
		schoolYearLabel: year?.label ?? null
	};
};

export const actions: Actions = {
	/**
	 * Constitution d'une commande à partir de la sélection.
	 *
	 * `create_order` crée la commande et y rattache ses items d'un seul tenant ;
	 * l'imputation par défaut vient ensuite.
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

		// Les deux invariants sont tenus par la base ; on refuse ici d'abord pour
		// donner un message plus précis que celui du trigger.
		const campuses = new Set(chosen.map((i) => i.campus));
		if (campuses.size > 1) {
			return fail(400, {
				message:
					"Une commande n'a qu'une destination : ces items relèvent de deux campus différents (CMD-F-45)."
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

		// Commande et rattachement des items dans une seule transaction : une
		// commande n'existe jamais sans item.
		const { data: orderId, error: createError } = await locals.supabase
			.schema('cash')
			.rpc('create_order', { p_item_ids: chosen.map((i) => i.id) });

		if (createError) {
			return fail(400, {
				message: await rejection(
					locals.supabase,
					createError,
					"La commande n'a pas pu être créée.",
					{
						entityType: 'item'
					}
				)
			});
		}

		await allocateDefaultLeaves(locals.supabase, schoolYearId, chosen);

		// `resolve` et non un chemin nu : l'app est servie sous /admin, et un
		// Location sans ce préfixe enverrait le navigateur sur le site public.
		redirect(303, resolve('/orders/[id]', { id: String(orderId) }));
	},

	/** Ajout d'items de la file à une commande encore en attente du trésorier. */
	add: async ({ locals, request }) => {
		const { user } = await locals.safeGetSession();
		if (!user?.id) {
			error(401, 'Session expirée.');
		}

		const form = await request.formData();
		const ids = selectedIds(form);
		const targetId = Number(text(form, 'order'));
		if (ids.length === 0) {
			return fail(400, { message: 'Aucun item sélectionné.' });
		}
		if (!Number.isSafeInteger(targetId) || targetId <= 0) {
			return fail(400, { message: 'Choisissez la commande à compléter.' });
		}

		const { data: chosen, error: readError } = await locals.supabase
			.schema('cash')
			.from('items')
			.select('id, project_id, total_ttc, school_year_id')
			.in('id', ids)
			.eq('state', 'pending_bundled')
			.is('order_id', null);

		if (readError || chosen.length === 0) {
			return fail(400, { message: 'Ces items ne sont plus disponibles au regroupement.' });
		}

		const { error: addError } = await locals.supabase
			.schema('cash')
			.rpc('add_items_to_order', { p_order_id: targetId, p_item_ids: chosen.map((i) => i.id) });

		if (addError) {
			return fail(400, {
				message: await rejection(
					locals.supabase,
					addError,
					"Ces items n'ont pas pu être ajoutés à la commande.",
					{
						entityType: 'order'
					}
				)
			});
		}

		const schoolYearId = chosen[0]?.school_year_id;
		if (schoolYearId !== undefined) {
			await allocateDefaultLeaves(locals.supabase, schoolYearId, chosen);
		}

		redirect(303, resolve('/orders/[id]', { id: String(targetId) }));
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
				message: await rejection(
					locals.supabase,
					updateError,
					"Ces items n'ont pas pu être refusés.",
					{
						entityType: 'item'
					}
				)
			});
		}

		return { refused: data.length, ignored: ids.length - data.length };
	}
};
