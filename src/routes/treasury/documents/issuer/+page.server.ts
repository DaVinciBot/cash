import { isOfficerGender } from '#lib/documents.js';
import { issuerFieldErrors, normalizeIdentifier } from '#lib/issuerValidation.js';
import { rejection } from '#lib/server/audit.js';
import { saveManualRanks, seriesNumbering } from '#lib/server/documentNumbering.js';
import { text } from '#lib/server/form.js';
import { organization } from '#lib/server/reports.js';
import { DOCUMENT_KINDS, type DocumentKind } from '#lib/types/domain.js';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Identité de l'émetteur et numérotation des documents — écran à part.
//
// C'est de la CONFIGURATION, pas un acte : on la renseigne une fois, elle sert
// ensuite à toutes les pièces. La mêler au formulaire d'émission laissait croire
// qu'il fallait la ressaisir à chaque document.
//
// La page s'ouvre avec `finance.read` (garde de route `/admin/treasury`), mais
// ne s'écrit qu'avec `finance.write` (policies `organization_write` et
// `document_number_offsets_write`) : un lecteur la consulte sans formulaire.

/** Année de la série affichée, celle de l'émission du prochain document. */
const currentYear = () => new Date().getFullYear();

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('cash:issuer');
	const year = currentYear();
	const [org, numbering, { data: canWrite }] = await Promise.all([
		organization(locals.supabase),
		seriesNumbering(locals.supabase, year),
		locals.supabase.rpc('has_permission', { p_permission: 'finance.write' })
	]);
	return { organization: org, numbering, year, canWrite: canWrite === true };
};

export const actions: Actions = {
	save: async ({ locals, request }) => {
		const form = await request.formData();
		const field = (name: string) => text(form, name) || null;
		const identifier = (name: string) => normalizeIdentifier(text(form, name)) || null;
		// La colonne est NOT NULL : une valeur hors enum retomberait sur l'épicène
		// plutôt que de faire échouer l'enregistrement de toute l'identité.
		const gender = (name: string) => {
			const raw = text(form, name);
			return isOfficerGender(raw) ? raw : 'epicene';
		};

		const errors = issuerFieldErrors({
			rna: text(form, 'rna'),
			siret: text(form, 'siret'),
			iban: text(form, 'iban'),
			bic: text(form, 'bic'),
			email: text(form, 'email'),
			website: text(form, 'website'),
			postalCode: text(form, 'postal_code'),
			country: text(form, 'country')
		});
		if (errors.length > 0) {
			return fail(400, { message: errors.join(' ') });
		}

		const { error } = await locals.supabase
			.schema('cash')
			.from('organization')
			.update({
				legal_name: field('legal_name'),
				address_line: field('address_line'),
				postal_code: field('postal_code'),
				city: field('city'),
				country: text(form, 'country') || 'France',
				rna: identifier('rna'),
				siret: identifier('siret'),
				vat_number: identifier('vat_number'),
				email: field('email'),
				website: field('website'),
				president_name: field('president_name'),
				president_gender: gender('president_gender'),
				treasurer_name: field('treasurer_name'),
				treasurer_gender: gender('treasurer_gender'),
				bank_name: field('bank_name'),
				iban: identifier('iban'),
				bic: identifier('bic'),
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
		return { saved: 'issuer' };
	},

	/**
	 * #81 — dernier rang émis hors du site, par série de l'année. Un champ vide
	 * vaut zéro : rien n'a été émis à la main.
	 */
	numbering: async ({ locals, request }) => {
		const form = await request.formData();
		const ranks: Partial<Record<DocumentKind, number>> = {};
		for (const kind of DOCUMENT_KINDS) {
			const raw = text(form, `rank_${kind}`);
			const rank = raw === '' ? 0 : Number(raw);
			if (!Number.isSafeInteger(rank) || rank < 0 || rank > 9999) {
				return fail(400, { message: 'Un rang est un entier entre 0 et 9999.' });
			}
			ranks[kind] = rank;
		}

		const error = await saveManualRanks(locals.supabase, currentYear(), ranks);
		if (error) {
			return fail(400, {
				message: await rejection(
					locals.supabase,
					error,
					"La numérotation n'a pas pu être enregistrée.",
					{
						entityType: 'document_number_offset'
					}
				)
			});
		}
		return { saved: 'numbering' };
	}
};
