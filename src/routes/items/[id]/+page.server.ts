import { entityHistory } from '$lib/server/audit';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Détail d'un item, en LECTURE (jalon 8).
//
// L'édition vit sur `/admin/items/[id]/edit` et n'accepte qu'un item encore
// `pending_cdp`. Un item validé, refusé ou reçu n'avait donc aucune page : son
// auteur voyait une ligne dans une liste, sans jamais savoir qui l'avait traité
// ni quand. C'est exactement ce que TRANS-NF-50 demande de rendre visible.
//
// Aucun filtre sur `requested_by` : la policy `items_read` ouvre la ligne à son
// auteur, au CDP du projet et au trésorier. Ajouter le filtre ici priverait le
// CDP d'un écran qu'il a le droit de voir.

export const load: PageServerLoad = async ({ depends, locals, params }) => {
	depends('cash:item');

	const id = Number(params.id);
	if (!Number.isInteger(id)) {
		error(404, 'Item introuvable.');
	}

	const { data: item } = await locals.supabase
		.schema('cash')
		.from('items')
		.select(
			'id, name, link, domain, unit_price_ttc, quantity, total_ttc, tags, note, state, campus, project_id, requested_by, order_id, refused_reason, cdp_approved_at, received_at, created_at'
		)
		.eq('id', id)
		.maybeSingle();

	if (!item) {
		error(404, 'Item introuvable.');
	}

	const [{ data: project }, { data: requester }, history] = await Promise.all([
		locals.supabase.from('projects').select('name').eq('id', item.project_id).maybeSingle(),
		locals.supabase.from('profiles').select('username').eq('id', item.requested_by).maybeSingle(),
		entityHistory(locals.supabase, 'item', id)
	]);

	const { user } = await locals.safeGetSession();

	return {
		item: {
			id: item.id,
			name: item.name,
			link: item.link,
			domain: item.domain,
			unitPriceTtc: item.unit_price_ttc,
			quantity: item.quantity,
			totalTtc: item.total_ttc ?? 0,
			tags: item.tags,
			note: item.note,
			state: item.state,
			campus: item.campus,
			projectName: project?.name ?? '—',
			requesterName: requester?.username ?? '—',
			orderId: item.order_id,
			refusedReason: item.refused_reason,
			cdpApprovedAt: item.cdp_approved_at,
			receivedAt: item.received_at,
			createdAt: item.created_at,
			isMine: item.requested_by === user?.id
		},
		history
	};
};
