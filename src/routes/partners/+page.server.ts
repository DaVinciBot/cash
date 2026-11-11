import { rejection } from '#lib/server/audit.js';
import { currentSchoolYear } from '#lib/server/cash.js';
import { decimal, text } from '#lib/server/form.js';
import { parseDomains } from '#lib/server/treasury.js';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Partenariats (TRESO-F-10/11/12).
//
// Des trois formes que prend un partenariat — remise, enveloppe, don — seule
// l'enveloppe est modélisée, sous forme de compte dont le solde décroît. La
// remise n'a pas de solde et se résout par la liste de domaines, qui sert aussi
// à reconnaître le partenaire dans le lien d'un item (CMD-F-05, TRESO-F-12).
//
// Seuls les partenariats ACTIFS réservent un nom (index partiel
// `partnerships_active_name_unique`) : un homonyme archivé ne bloque rien. Et
// l'enveloppe suit son partenariat — elle s'archive et se rouvre avec lui
// (trigger `partnerships_sync_envelope_archive`), jamais depuis la trésorerie.

const DUPLICATE_NAME = 'Un partenariat actif porte déjà ce nom pour cette année scolaire.';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('cash:partners');

	const [year, { data: years }] = await Promise.all([
		currentSchoolYear(locals.supabase),
		locals.supabase
			.schema('cash')
			.from('school_years')
			.select('id, label')
			.order('starts_on', { ascending: false })
	]);

	return {
		schoolYearId: year?.id ?? null,
		schoolYears: (years ?? []).map((y) => ({ id: y.id, label: y.label }))
	};
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

		// Vérifié AVANT de créer l'enveloppe : sinon un doublon laisserait derrière
		// lui un compte orphelin. La base reste juge en dernier ressort (23505).
		const { count: homonyms } = await locals.supabase
			.schema('cash')
			.from('partnerships')
			.select('id', { count: 'exact', head: true })
			.eq('school_year_id', schoolYearId)
			.eq('name', name)
			.is('archived_at', null);
		if (homonyms) {
			return fail(409, { message: DUPLICATE_NAME });
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
						accountError.code === '23505'
							? `Un compte ouvert s'appelle déjà « Enveloppe ${name} » : archivez-le ou renommez-le d'abord.`
							: "L'enveloppe n'a pas pu être créée.",
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
			// Le partenariat n'existe pas : son enveloppe non plus.
			if (accountId !== null) {
				await locals.supabase.schema('cash').from('bank_accounts').delete().eq('id', accountId);
			}
			return fail(400, {
				message: await rejection(
					locals.supabase,
					error,
					error.code === '23505' ? DUPLICATE_NAME : "Ce partenariat n'a pas pu être créé.",
					{
						entityType: 'partnership'
					}
				)
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
					error.code === '23505' ? DUPLICATE_NAME : "Ce partenariat n'a pas pu être modifié.",
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
	 * commandes, et son enveloppe explique des soldes passés. L'enveloppe est
	 * archivée avec lui par la base, sauf si un autre partenariat actif la vise.
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
	},

	/**
	 * Désarchivage : le partenariat redevient reconnu dans les liens, et son
	 * enveloppe se rouvre. Refusé si un homonyme actif a pris sa place.
	 */
	unarchive: async ({ locals, request }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!Number.isSafeInteger(id)) {
			return fail(400, { message: 'Partenariat invalide.' });
		}

		const { error } = await locals.supabase
			.schema('cash')
			.from('partnerships')
			.update({ archived_at: null })
			.eq('id', id);

		if (error) {
			return fail(400, {
				message: await rejection(
					locals.supabase,
					error,
					error.code === '23505'
						? "Un partenariat actif porte déjà ce nom (ou le nom de son enveloppe) : archivez-le d'abord."
						: "Ce partenariat n'a pas pu être désarchivé.",
					{
						entityType: 'partnership'
					}
				)
			});
		}
		return { saved: 'partner' };
	}
};
