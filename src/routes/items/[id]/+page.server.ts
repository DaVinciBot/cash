import {
	ATTACHMENT_ACCEPT,
	attachFile,
	attachmentsOf,
	detachFile,
	isChosenFile
} from '#lib/server/attachments.js';
import { entityHistory } from '#lib/server/audit.js';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

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

	const [{ data: project }, { data: requester }, history, attachments, { data: bundler }] =
		await Promise.all([
			locals.supabase.from('projects').select('name').eq('id', item.project_id).maybeSingle(),
			locals.supabase.from('profiles').select('username').eq('id', item.requested_by).maybeSingle(),
			entityHistory(locals.supabase, 'item', id),
			attachmentsOf(locals.supabase, [id]),
			locals.supabase.rpc('has_permission', { p_permission: 'orders.bundle.manage' })
		]);

	const { user } = await locals.safeGetSession();
	// #63 — déposer ou retirer une pièce : l'auteur, ou qui constitue la commande.
	// Les policies du bucket et de la table en décident ; l'écran ne fait que suivre.
	const canAttach = item.requested_by === user?.id || bundler === true;

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
		history,
		attachments: attachments.get(id) ?? [],
		canAttach,
		attachmentAccept: ATTACHMENT_ACCEPT
	};
};

export const actions: Actions = {
	/** #63 — joindre un fichier à un item déjà demandé. */
	attach: async ({ locals, params, request }) => {
		const id = Number(params.id);
		const form = await request.formData();
		const file = form.get('file');
		if (!Number.isInteger(id) || !isChosenFile(file)) {
			return fail(400, { message: 'Choisissez un fichier.' });
		}
		const problem = await attachFile(locals.supabase, id, file);
		if (problem) {
			return fail(400, { message: problem });
		}
		return { saved: 'attached' };
	},

	detach: async ({ locals, request }) => {
		const form = await request.formData();
		const attachmentId = Number(form.get('attachment'));
		if (!Number.isSafeInteger(attachmentId)) {
			return fail(400, { message: 'Pièce jointe invalide.' });
		}
		if (!(await detachFile(locals.supabase, attachmentId))) {
			return fail(400, { message: "Cette pièce jointe n'a pas pu être retirée." });
		}
		return { saved: 'detached' };
	}
};
