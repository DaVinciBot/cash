import { domainOf } from '#lib/promoCodes.js';
import { rejection } from '#lib/server/audit.js';
import { text } from '#lib/server/form.js';
import { createPromoCode, promoCodes, setPromoArchived } from '#lib/server/promoCodes.js';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Codes promotionnels des fournisseurs (#92, #98). La page s'ouvre avec
// `finance.read` (garde `/admin/treasury`) ; l'écriture exige `finance.write`
// (policy `promo_codes_write`).

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('cash:promo-codes');
	const [codes, { data: canWrite }] = await Promise.all([
		promoCodes(locals.supabase),
		locals.supabase.rpc('has_permission', { p_permission: 'finance.write' })
	]);
	return { codes, canWrite: canWrite === true };
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		const form = await request.formData();
		const supplier = text(form, 'supplier');
		const code = text(form, 'code');
		const discount = text(form, 'discount');
		const conditions = text(form, 'conditions');
		const expiresOn = text(form, 'expires_on');
		// Un nom de domaine, une adresse ou un lien : tout se ramène au domaine
		// enregistrable, comme `items.domain`.
		const domain = domainOf(text(form, 'domain'));

		if (!supplier || !code || !discount) {
			return fail(400, { message: 'Fournisseur, code et remise sont obligatoires.' });
		}
		if (!domain) {
			return fail(400, {
				message: 'Indiquez le site du fournisseur (par exemple mouser.fr ou ldlc.com).'
			});
		}
		if (expiresOn && !ISO_DAY.test(expiresOn)) {
			return fail(400, { message: "Date d'expiration invalide." });
		}

		const error = await createPromoCode(locals.supabase, {
			supplier,
			domain,
			code,
			discount,
			conditions: conditions || null,
			expires_on: expiresOn || null
		});
		if (error) {
			return fail(400, {
				message: await rejection(locals.supabase, error, "Ce code n'a pas pu être enregistré.", {
					entityType: 'promo_code'
				})
			});
		}
		return { saved: 'created' };
	},

	toggleArchive: async ({ locals, request }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!Number.isSafeInteger(id)) {
			return fail(400, { message: 'Code invalide.' });
		}
		const error = await setPromoArchived(locals.supabase, id, text(form, 'archive') === '1');
		if (error) {
			return fail(400, {
				message: await rejection(locals.supabase, error, "Ce code n'a pas pu être modifié.", {
					entityType: 'promo_code'
				})
			});
		}
		return { saved: 'archived' };
	}
};
