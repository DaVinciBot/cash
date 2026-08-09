import { decimal, text } from '$lib/server/form';
import { budgetLeaves, campusAddress, orderDetail } from '$lib/server/orders';
import { cashErrorMessage, SHIPPING_ALLOCATIONS, type ShippingAllocation } from '@davincibot/lib';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Détail et pilotage d'une commande. Toutes les actions écrivent sous le jeton
// du trésorier : `orders_write` et `items_update` restent seules juges, et les
// invariants — campus unique, imputation complète, budget suffisant — sont tenus
// par des triggers. Ce fichier ne fait que traduire leurs refus en français.

function orderId(params: { id: string }): number {
	const id = Number(params.id);
	if (!Number.isSafeInteger(id) || id <= 0) {
		error(404, 'Commande introuvable.');
	}
	return id;
}

export const load: PageServerLoad = async ({ locals, params, depends }) => {
	depends('cash:order');

	const id = orderId(params);
	const order = await orderDetail(locals.supabase, id);
	if (!order) {
		error(404, 'Commande introuvable.');
	}

	const [{ leaves }, address] = await Promise.all([
		budgetLeaves(locals.supabase, order.schoolYearId),
		order.campus ? campusAddress(locals.supabase, order.campus) : Promise.resolve(null)
	]);

	return { order, leaves, address };
};

export const actions: Actions = {
	/** Frais de port et mode de répartition (CMD-F-12, §7.2). */
	shipping: async ({ locals, params, request }) => {
		const id = orderId(params);
		const form = await request.formData();
		const cost = decimal(form, 'shipping_cost_ttc');
		const mode = text(form, 'shipping_allocation');

		if (!Number.isFinite(cost) || cost < 0) {
			return fail(400, { message: 'Les frais de port doivent être un montant positif.' });
		}
		if (!SHIPPING_ALLOCATIONS.includes(mode as ShippingAllocation)) {
			return fail(400, { message: 'Mode de répartition inconnu.' });
		}

		const { error: updateError } = await locals.supabase
			.schema('cash')
			.from('orders')
			.update({
				shipping_cost_ttc: cost,
				shipping_allocation: mode as ShippingAllocation
			})
			.eq('id', id);

		if (updateError) {
			return fail(400, {
				message: cashErrorMessage(
					updateError.code,
					'Les frais de port n’ont pas pu être enregistrés.'
				)
			});
		}
		return { saved: 'shipping' };
	},

	/**
	 * Passage de la commande (§8).
	 *
	 * Deux refus possibles et volontairement distincts : DVB05 quand un item
	 * n'est imputé nulle part, DVB06 quand un budget ne couvre pas sa part. Le
	 * second n'a de sens qu'une fois le premier levé, ce que l'ordre des triggers
	 * garantit.
	 */
	pass: async ({ locals, params }) => {
		const id = orderId(params);

		// Le trigger dira DVB05, mais avec le message générique de l'imputation
		// invalide — qui n'apprend rien à qui a simplement oublié un item. On
		// nomme donc les items fautifs avant de tenter l'écriture ; la base reste
		// la garde, ceci n'est que la formulation.
		const detail = await orderDetail(locals.supabase, id);
		const orphans = detail?.items.filter((i) => i.allocations.length === 0) ?? [];
		if (orphans.length > 0) {
			return fail(400, {
				message: `Sans budget d’imputation : ${orphans.map((i) => i.name).join(', ')}. Ouvrez chaque item pour lui désigner un poste de dépense.`
			});
		}

		const { error: updateError } = await locals.supabase
			.schema('cash')
			.from('orders')
			.update({ state: 'pending_delivery' })
			.eq('id', id)
			.eq('state', 'pending_treso');

		if (updateError) {
			return fail(400, {
				message: cashErrorMessage(updateError.code, 'La commande n’a pas pu être passée.'),
				blocked: updateError.code
			});
		}
		return { saved: 'passed' };
	},

	/** Annulation : le trigger `on_order_canceled` renvoie les items non reçus à la file. */
	cancel: async ({ locals, params }) => {
		const id = orderId(params);
		const { error: updateError } = await locals.supabase
			.schema('cash')
			.from('orders')
			.update({ state: 'canceled' })
			.eq('id', id)
			.in('state', ['pending_treso', 'pending_delivery']);

		if (updateError) {
			return fail(400, {
				message: cashErrorMessage(updateError.code, 'La commande n’a pas pu être annulée.')
			});
		}
		return { saved: 'canceled' };
	},

	/** Réception item par item (CMD-F-25) — la commande bascule seule (CMD-F-26). */
	receive: async ({ locals, params, request }) => {
		orderId(params);
		const form = await request.formData();
		const itemId = Number(form.get('item'));
		if (!Number.isSafeInteger(itemId)) {
			return fail(400, { message: 'Item invalide.' });
		}

		const { error: updateError } = await locals.supabase
			.schema('cash')
			.from('items')
			.update({ state: 'received' })
			.eq('id', itemId)
			.eq('state', 'bundled');

		if (updateError) {
			return fail(400, {
				message: cashErrorMessage(updateError.code, 'Cet item n’a pas pu être marqué reçu.')
			});
		}
		return { saved: 'received' };
	},

	/** Retrait d'un item de la commande : il repart dans la file de regroupement. */
	detach: async ({ locals, params, request }) => {
		orderId(params);
		const form = await request.formData();
		const itemId = Number(form.get('item'));
		if (!Number.isSafeInteger(itemId)) {
			return fail(400, { message: 'Item invalide.' });
		}

		const { error: updateError } = await locals.supabase
			.schema('cash')
			.from('items')
			.update({ state: 'pending_bundled', order_id: null })
			.eq('id', itemId)
			.eq('state', 'bundled');

		if (updateError) {
			return fail(400, {
				message: cashErrorMessage(updateError.code, 'Cet item n’a pas pu être retiré.')
			});
		}
		return { saved: 'detached' };
	},

	/**
	 * Troisième issue de CMD-F-53 : l'enveloppe était sous-évaluée.
	 *
	 * On n'ouvre ici que le montant d'une feuille, pas la gestion de l'arbre —
	 * création, renommage, réorganisation et archivage restent au jalon 6. La
	 * policy `budgets_write` (finance.write) tranche, et le journal métier garde
	 * trace de l'ancien montant.
	 */
	raiseBudget: async ({ locals, request }) => {
		const form = await request.formData();
		const budgetId = Number(form.get('budget'));
		const amount = decimal(form, 'amount_ttc');

		if (!Number.isSafeInteger(budgetId)) {
			return fail(400, { message: 'Budget invalide.' });
		}
		if (!Number.isFinite(amount) || amount < 0) {
			return fail(400, { message: 'Le montant doit être positif.' });
		}

		const { error: updateError } = await locals.supabase
			.schema('cash')
			.from('budgets')
			.update({ amount_ttc: amount })
			.eq('id', budgetId);

		if (updateError) {
			return fail(400, {
				message: cashErrorMessage(updateError.code, 'Ce budget n’a pas pu être modifié.')
			});
		}
		return { saved: 'budget' };
	}
};
