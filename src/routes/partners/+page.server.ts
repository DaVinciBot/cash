import { rejection } from '$lib/server/audit';
import { currentSchoolYear } from '$lib/server/cash';
import { decimal, text } from '$lib/server/form';
import { accounts, parseDomains, partnerships } from '$lib/server/treasury';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Partenariats (TRESO-F-10/11/12).
//
// Des trois formes que prend un partenariat — remise, enveloppe, don — seule
// l'enveloppe est modélisée, sous forme de compte dont le solde décroît. La
// remise n'a pas de solde et se résout par la liste de domaines, qui sert aussi
// à reconnaître le partenaire dans le lien d'un item (CMD-F-05, TRESO-F-12).

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('cash:partners');

	const [rows, accountRows, year] = await Promise.all([
		partnerships(locals.supabase),
		accounts(locals.supabase),
		currentSchoolYear(locals.supabase)
	]);

	return { partnerships: rows, accounts: accountRows, schoolYearId: year?.id ?? null };
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		const form = await request.formData();
		const name = text(form, 'name');
		const schoolYearId = Number(form.get('school_year_id'));
		const domains = parseDomains(text(form, 'domains'));
		const notes = text(form, 'notes');
		const envelope = text(form, 'envelope') === '1';
		const opening = decimal(form, 'opening_balance');

		if (name.length === 0) {
			return fail(400, { message: 'Le nom du partenariat est obligatoire.' });
		}
		if (!Number.isSafeInteger(schoolYearId)) {
			return fail(400, { message: 'Année scolaire invalide.' });
		}

		// L'enveloppe est un compte, pas un champ du partenariat : c'est ce qui
		// lui donne un solde et la fait apparaître dans les règlements.
		let accountId: number | null = null;
		if (envelope) {
			if (!Number.isFinite(opening) || opening < 0) {
				return fail(400, { message: "Le montant de l'enveloppe doit être positif." });
			}
			const { data: account, error: accountError } = await locals.supabase
				.schema('cash')
				.from('bank_accounts')
				.insert({
					name: `Enveloppe ${name}`,
					kind: 'partner_credit',
					opening_balance: opening
				})
				.select('id')
				.single();

			if (accountError) {
				return fail(400, {
					message: await rejection(
						locals.supabase,
						accountError,
						"L'enveloppe n'a pas pu être créée.",
						{
							entityType: 'partnership'
						}
					)
				});
			}
			accountId = account.id;
		}

		const { error } = await locals.supabase
			.schema('cash')
			.from('partnerships')
			.insert({
				name,
				school_year_id: schoolYearId,
				domains,
				notes: notes || null,
				account_id: accountId
			});

		if (error) {
			return fail(400, {
				message: await rejection(locals.supabase, error, "Ce partenariat n'a pas pu être créé.", {
					entityType: 'partnership'
				})
			});
		}
		return { saved: 'partner' };
	},

	update: async ({ locals, request }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		const name = text(form, 'name');
		const domains = parseDomains(text(form, 'domains'));
		const notes = text(form, 'notes');

		if (!Number.isSafeInteger(id)) {
			return fail(400, { message: 'Partenariat invalide.' });
		}
		if (name.length === 0) {
			return fail(400, { message: 'Le nom du partenariat est obligatoire.' });
		}

		const { error } = await locals.supabase
			.schema('cash')
			.from('partnerships')
			.update({ name, domains, notes: notes || null })
			.eq('id', id);

		if (error) {
			return fail(400, {
				message: await rejection(
					locals.supabase,
					error,
					"Ce partenariat n'a pas pu être modifié.",
					{
						entityType: 'partnership'
					}
				)
			});
		}
		return { saved: 'partner' };
	},

	/**
	 * Archivage plutôt que suppression : un partenariat éteint a pu porter des
	 * commandes, et son enveloppe explique des soldes passés.
	 */
	archive: async ({ locals, request }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!Number.isSafeInteger(id)) {
			return fail(400, { message: 'Partenariat invalide.' });
		}

		const { error } = await locals.supabase
			.schema('cash')
			.from('partnerships')
			.update({ archived_at: new Date().toISOString() })
			.eq('id', id);

		if (error) {
			return fail(400, {
				message: await rejection(
					locals.supabase,
					error,
					"Ce partenariat n'a pas pu être archivé.",
					{
						entityType: 'partnership'
					}
				)
			});
		}
		return { saved: 'partner' };
	}
};
