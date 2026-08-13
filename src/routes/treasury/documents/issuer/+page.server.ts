import { text } from '$lib/server/form';
import { organization } from '$lib/server/reports';
import { cashErrorMessage } from '@davincibot/lib';
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
				signatory_name: field('signatory_name'),
				signatory_title: field('signatory_title'),
				bank_name: field('bank_name'),
				iban: field('iban'),
				bic: field('bic'),
				tax_receipts_allowed: text(form, 'tax_receipts_allowed') === '1',
				tax_category: field('tax_category'),
				tax_articles: field('tax_articles')
			})
			.eq('id', 1);

		if (error) {
			return fail(400, {
				message: cashErrorMessage(
					error.code,
					"L'identité de l'émetteur n'a pas pu être enregistrée."
				)
			});
		}
		return { saved: true };
	}
};
