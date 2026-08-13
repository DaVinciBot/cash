import { resolve } from '$app/paths';
import { memberProjects } from '$lib/server/cash';
import { decimal, jsonArray, text } from '$lib/server/form';
import { cashErrorMessage, type ItemTag } from '@davincibot/lib';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// CMD-F-02 : un membre modifie ses items tant qu'ils ne sont ni validés ni
// rattachés à une commande. La règle est portée par la policy `items_update`
// (`requested_by = auth.uid() AND state = 'pending_cdp'`) ; l'écran ne fait que
// la rendre lisible, il ne la redouble pas.

export const load: PageServerLoad = async ({ depends, locals, params }) => {
	depends('cash:item');

	const { user } = await locals.safeGetSession();
	if (!user?.id) {
		error(401, 'Session expirée.');
	}

	const id = Number(params.id);
	if (!Number.isInteger(id)) {
		error(404, 'Item introuvable.');
	}

	const { data: item } = await locals.supabase
		.schema('cash')
		.from('items')
		.select('id, name, link, unit_price_ttc, quantity, tags, note, state, campus, project_id')
		.eq('id', id)
		.eq('requested_by', user.id)
		.maybeSingle();

	if (!item) {
		error(404, 'Item introuvable.');
	}
	if (item.state !== 'pending_cdp') {
		error(403, "Cet item a déjà été traité : il n'est plus modifiable.");
	}

	const projects = await memberProjects(locals.supabase, user.id);

	return {
		item: {
			id: item.id,
			name: item.name,
			link: item.link ?? '',
			unitPriceTtc: item.unit_price_ttc,
			quantity: item.quantity,
			tags: item.tags,
			note: item.note ?? '',
			campus: item.campus,
			projectId: item.project_id
		},
		projectName: projects.find((p) => p.id === item.project_id)?.name ?? '—'
	};
};

export const actions: Actions = {
	default: async ({ locals, params, request }) => {
		const { user } = await locals.safeGetSession();
		if (!user?.id) {
			error(401, 'Session expirée.');
		}

		const id = Number(params.id);
		const form = await request.formData();
		const name = text(form, 'name');
		const link = text(form, 'link');
		const price = decimal(form, 'unit_price_ttc');
		const quantity = Number(text(form, 'quantity'));
		const note = text(form, 'note');
		const tags = jsonArray<ItemTag>(text(form, 'tags'));

		if (!name) {
			return fail(400, { message: 'Le nom est obligatoire.' });
		}
		if (!Number.isFinite(price) || price < 0) {
			return fail(400, { message: 'Prix unitaire invalide.' });
		}
		if (!Number.isInteger(quantity) || quantity < 1) {
			return fail(400, { message: 'La quantité doit être au moins 1.' });
		}

		const { error: updateError, count } = await locals.supabase
			.schema('cash')
			.from('items')
			.update(
				{
					name,
					link: link || null,
					unit_price_ttc: Math.round(price * 100) / 100,
					quantity,
					tags,
					note: note || null
				},
				{ count: 'exact' }
			)
			.eq('id', id);

		if (updateError) {
			return fail(400, {
				message: cashErrorMessage(updateError.code, "Cet item n'a pas pu être modifié.")
			});
		}
		if (count === 0) {
			return fail(403, {
				message: "Cet item a été traité entre-temps : il n'est plus modifiable."
			});
		}

		redirect(303, resolve('/'));
	}
};
