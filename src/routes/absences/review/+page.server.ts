import type { AbsenceStatus } from '#lib/absences.js';
import {
	isReviewer,
	parseReviewFilters,
	requesters,
	reviewRequests
} from '#lib/server/absences.js';
import { rejection } from '#lib/server/audit.js';
import { text } from '#lib/server/form.js';
import { refusalReasonError } from '#lib/types/domain.js';
import { error, fail, type RequestEvent } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Vue Secrétaire. La garde de route (`canAccessAdminPath`) ferme déjà l'écran à
// qui n'a pas `absences.requests.review`, et la RLS ferme les lignes ; le
// contrôle ci-dessous ne fait que transformer un accès direct en 403 lisible
// plutôt qu'en file vide ou en « demande introuvable ».

async function assertReviewer(supabase: App.Locals['supabase']) {
	if (!(await isReviewer(supabase))) {
		error(403, "Le traitement des demandes d'excuse est réservé au Secrétaire.");
	}
}

export const load: PageServerLoad = async ({ locals, url, depends }) => {
	depends('cash:absences:review');
	await assertReviewer(locals.supabase);

	const filters = parseReviewFilters(url.searchParams);
	const [requests, members] = await Promise.all([
		reviewRequests(locals.supabase, filters),
		requesters(locals.supabase)
	]);

	return { filters, requests, members };
};

/** Change le statut d'une demande ; le trigger date et attribue la décision. */
async function decide(
	{ locals, request }: RequestEvent,
	status: AbsenceStatus,
	failureMessage: string
) {
	const { user } = await locals.safeGetSession();
	if (!user?.id) {
		error(401, 'Session expirée.');
	}
	await assertReviewer(locals.supabase);

	const form = await request.formData();
	const id = Number(text(form, 'id'));
	if (!Number.isSafeInteger(id) || id <= 0) {
		return fail(400, { message: 'Demande introuvable.' });
	}

	let refusalReason: string | null = null;
	if (status === 'refused') {
		refusalReason = text(form, 'reason');
		const reasonError = refusalReasonError(refusalReason);
		if (reasonError) {
			return fail(400, { message: reasonError, refusing: id, reason: refusalReason });
		}
	}

	// Le motif est effacé par le trigger hors refus : l'envoyer à `null` ne
	// sert qu'à rendre l'intention lisible ici.
	const { data, error: updateError } = await locals.supabase
		.schema('cash')
		.from('absence_request')
		.update({ status, refusal_reason: refusalReason })
		.eq('id', id)
		.select('id');

	if (updateError) {
		return fail(400, {
			message: await rejection(locals.supabase, updateError, failureMessage, {
				entityType: 'absence_request',
				entityId: id
			})
		});
	}
	if (data.length === 0) {
		return fail(404, { message: 'Demande introuvable.' });
	}

	return { decided: status };
}

export const actions: Actions = {
	approve: (event) => decide(event, 'approved', "La demande n'a pas pu être validée."),
	refuse: (event) => decide(event, 'refused', "La demande n'a pas pu être refusée."),
	reopen: (event) => decide(event, 'pending', "La demande n'a pas pu être remise en attente.")
};
