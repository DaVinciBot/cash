import { isOfficerGender } from '$lib/documents';
import { rejection } from '$lib/server/audit';
import { text } from '$lib/server/form';
import { organization } from '$lib/server/reports';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Identité de l'émetteur — écran à part.
//
// C'est de la CONFIGURATION, pas un acte : on la renseigne une fois, elle sert
// ensuite à toutes les pièces. La mêler au formulaire d'émission laissait croire
// qu'il fallait la ressaisir à chaque document.

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('cash:issuer');
	return { organization: await organization(locals.supabase) };
};

export const actions: Actions = {
	save: async ({ locals, request }) => {
		const form = await request.formData();
		const field = (name: string) => text(form, name) || null;
		// La colonne est NOT NULL : une valeur hors enum retomberait sur l'épicène
		// plutôt que de faire échouer l'enregistrement de toute l'identité.
		const gender = (name: string) => {
			const raw = text(form, name);
			return isOfficerGender(raw) ? raw : 'epicene';
		};

		const { error } = await locals.supabase
			.schema('cash')
			.from('organization')
			.update({
				legal_name: field('legal_name'),
				address_line: field('address_line'),
				postal_code: field('postal_code'),
				city: field('city'),
				country: text(form, 'country') || 'France',
				rna: field('rna'),
				siret: field('siret'),
				vat_number: field('vat_number'),
				email: field('email'),
				website: field('website'),
				president_name: field('president_name'),
				president_gender: gender('president_gender'),
				treasurer_name: field('treasurer_name'),
				treasurer_gender: gender('treasurer_gender'),
				bank_name: field('bank_name'),
				iban: field('iban'),
				bic: field('bic'),
				purpose: field('purpose'),
				tax_receipts_allowed: text(form, 'tax_receipts_allowed') === '1',
				tax_category: field('tax_category'),
				tax_articles: field('tax_articles')
			})
			.eq('id', 1);

		if (error) {
			return fail(400, {
				message: await rejection(
					locals.supabase,
					error,
					"L'identité de l'émetteur n'a pas pu être enregistrée.",
					{
						entityType: 'organization'
					}
				)
			});
		}
		return { saved: true };
	}
};
