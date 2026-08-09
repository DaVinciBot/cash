import { resolve } from '$app/paths';
import { decimal, text, textAll } from '$lib/server/form';
import { budgetLeaves, orderDetail } from '$lib/server/orders';
import { cashErrorMessage } from '@davincibot/lib';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Édition plein écran d'un item de commande (CMD-F-30, CMD-F-33, CMD-F-34).
//
// Une route dédiée plutôt qu'un drawer : elle règle d'un coup l'exiguïté
// reprochée à l'ancien tiroir et le bug de multi-ouverture, puisqu'il ne peut
// exister qu'une page à la fois.
//
// Le prix se saisit en UNITAIRE et la quantité à part : le total reste une
// colonne générée (CMD-F-38), jamais un champ. CMD-F-31, qui voulait aussi la
// saisie du total, n'est donc couverte qu'à moitié — saisir un total non
// divisible par la quantité imposerait un arrondi que le modèle ne peut pas
// représenter sans mentir sur l'un des deux montants.

function ids(params: { id: string; itemId: string }): { orderId: number; itemId: number } {
	const orderId = Number(params.id);
	const itemId = Number(params.itemId);
	if (!Number.isSafeInteger(orderId) || !Number.isSafeInteger(itemId)) {
		error(404, 'Item introuvable.');
	}
	return { orderId, itemId };
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const { orderId, itemId } = ids(params);

	const order = await orderDetail(locals.supabase, orderId);
	const item = order?.items.find((i) => i.id === itemId);
	if (!order || !item) {
		error(404, 'Item introuvable.');
	}

	const { leaves } = await budgetLeaves(locals.supabase, order.schoolYearId);

	return { order: { id: order.id, state: order.state }, item, leaves };
};

export const actions: Actions = {
	default: async ({ locals, params, request }) => {
		const { orderId, itemId } = ids(params);
		const form = await request.formData();

		const name = text(form, 'name');
		const link = text(form, 'link');
		const unitPrice = decimal(form, 'unit_price_ttc');
		const quantity = Number(text(form, 'quantity'));

		if (name.length === 0) {
			return fail(400, { message: 'Le nom de l’item est obligatoire.' });
		}
		if (!Number.isFinite(unitPrice) || unitPrice < 0) {
			return fail(400, { message: 'Le prix unitaire doit être un montant positif.' });
		}
		if (!Number.isSafeInteger(quantity) || quantity <= 0) {
			return fail(400, { message: 'La quantité doit être un entier strictement positif.' });
		}

		// Arrondi au centime avant écriture : `unit_price_ttc` est un numeric(12,2)
		// et Postgres arrondirait de toute façon — autant calculer le total sur la
		// valeur réellement stockée plutôt que sur la saisie.
		const unitPriceTtc = Math.round(unitPrice * 100) / 100;
		const totalTtc = Math.round(unitPriceTtc * quantity * 100) / 100;

		const budgetIds = textAll(form, 'budget')
			.map(Number)
			.filter((id) => Number.isSafeInteger(id) && id > 0);
		const amounts = textAll(form, 'amount').map((raw) => Number(raw.replace(',', '.')));

		const lines = budgetIds
			.map((budgetId, index) => ({ budgetId, amount: amounts[index] ?? 0 }))
			.filter((line) => Number.isFinite(line.amount) && line.amount > 0);

		if (new Set(lines.map((l) => l.budgetId)).size !== lines.length) {
			return fail(400, { message: 'Un même budget ne peut apparaître qu’une fois.' });
		}

		const allocated = Math.round(lines.reduce((sum, l) => sum + l.amount, 0) * 100) / 100;
		if (lines.length > 0 && allocated !== totalTtc) {
			return fail(400, {
				message: `La somme des imputations (${allocated.toFixed(2)} €) doit égaler le total de l’item (${totalTtc.toFixed(2)} €).`
			});
		}

		// Une seule RPC pour le prix ET les imputations. Séparées, les deux
		// écritures se rejettent l'une l'autre : chaque requête PostgREST est sa
		// propre transaction, et les deux gardes différées comparent la somme des
		// parts au total au moment du commit.
		const { error: saveError } = await locals.supabase.schema('cash').rpc('edit_order_item', {
			p_item_id: itemId,
			p_name: name,
			p_link: link,
			p_unit_price_ttc: unitPriceTtc,
			p_quantity: quantity,
			p_budget_ids: lines.map((l) => l.budgetId),
			p_amounts: lines.map((l) => l.amount)
		});

		if (saveError) {
			return fail(400, {
				message: cashErrorMessage(saveError.code, 'Cet item n’a pas pu être modifié.')
			});
		}

		redirect(303, resolve('/orders/[id]', { id: String(orderId) }));
	}
};
