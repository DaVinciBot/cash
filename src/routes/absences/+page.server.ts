import { absenceRequestErrors, isOwnProofPath } from '#lib/absences.js';
import { myRequests } from '#lib/server/absences.js';
import { rejection } from '#lib/server/audit.js';
import { text } from '#lib/server/form.js';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Page membre des demandes d'excuse. Le justificatif ne transite pas par ici :
// le navigateur l'envoie directement au bucket (BODY_SIZE_LIMIT d'adapter-node
// vaut 512 Ko, en dessous des 5 Mo autorisés) et l'action ne reçoit que son
// chemin. Les règles de fond — créneau ordonné, motif non vide, pièce dans le
// dossier du membre, statut initial — sont aussi tenues par la base.

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('cash:absences');

	const { user } = await locals.safeGetSession();
	if (!user?.id) {
		return { requests: [], email: '' };
	}

	return { requests: await myRequests(locals.supabase, user.id), email: user.email ?? '' };
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		const { user } = await locals.safeGetSession();
		if (!user?.id) {
			error(401, 'Session expirée.');
		}

		const form = await request.formData();
		const values = {
			date: text(form, 'date'),
			startTime: text(form, 'start_time'),
			endTime: text(form, 'end_time'),
			reason: text(form, 'reason'),
			attested: text(form, 'attested') === 'on'
		};
		const proofPath = text(form, 'proof_path') || null;

		const errors = absenceRequestErrors(values);
		if (Object.keys(errors).length > 0) {
			return fail(400, { errors, values });
		}
		if (proofPath && !isOwnProofPath(proofPath, user.id)) {
			return fail(400, { message: 'Justificatif invalide : renvoie le fichier.', values });
		}

		// Ni le mail ni l'attestation ne sont envoyés : le trigger les pose depuis
		// le JWT et l'horloge de la base.
		const { error: insertError } = await locals.supabase
			.schema('cash')
			.from('absence_request')
			.insert({
				absence_date: values.date,
				start_time: values.startTime,
				end_time: values.endTime,
				reason: values.reason,
				proof_path: proofPath
			});

		if (insertError) {
			return fail(400, {
				message: await rejection(
					locals.supabase,
					insertError,
					"La demande n'a pas pu être envoyée.",
					{ entityType: 'absence_request' }
				),
				values
			});
		}

		return { created: true };
	},

	/**
	 * Annulation d'une demande en attente. La ligne part d'abord : tant qu'une
	 * demande cite le justificatif, la policy du bucket en interdit la
	 * suppression.
	 */
	cancel: async ({ locals, request }) => {
		const { user } = await locals.safeGetSession();
		if (!user?.id) {
			error(401, 'Session expirée.');
		}

		const id = Number(text(await request.formData(), 'id'));
		if (!Number.isSafeInteger(id) || id <= 0) {
			return fail(400, { message: 'Demande introuvable.' });
		}

		// Le filtre sur `pending` double la RLS pour pouvoir distinguer, dans la
		// réponse, une demande tranchée entre-temps d'une erreur.
		const { data, error: deleteError } = await locals.supabase
			.schema('cash')
			.from('absence_request')
			.delete()
			.eq('id', id)
			.eq('status', 'pending')
			.select('id, proof_path');

		if (deleteError) {
			return fail(400, {
				message: await rejection(
					locals.supabase,
					deleteError,
					"La demande n'a pas pu être annulée.",
					{ entityType: 'absence_request', entityId: String(id) }
				)
			});
		}
		if (data.length === 0) {
			return fail(409, { message: 'Cette demande a déjà été traitée.' });
		}

		const proofPath = data[0]?.proof_path;
		if (proofPath) {
			// Best-effort : une pièce restée orpheline ne gêne personne et reste
			// supprimable plus tard.
			await locals.supabase.storage.from('absence-proofs').remove([proofPath]);
		}

		return { cancelled: true };
	}
};
