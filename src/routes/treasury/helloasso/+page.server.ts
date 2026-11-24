import { rejection } from '#lib/server/audit.js';
import { text } from '#lib/server/form.js';
import {
	campaignProblem,
	campaignSettings,
	HELLOASSO_HANDLER_LABELS,
	HELLOASSO_HANDLERS,
	saveCampaignSetting
} from '#lib/server/helloasso.js';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Campagnes HelloAsso de l'année (helloasso-webhooks#1). La page s'ouvre avec
// `finance.read` (garde `/admin/treasury`) ; l'enregistrement exige
// `finance.write`, vérifié par la RPC.

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('cash:helloasso');
	const [{ settings, error }, { data: canWrite }] = await Promise.all([
		campaignSettings(locals.supabase),
		locals.supabase.rpc('has_permission', { p_permission: 'finance.write' })
	]);
	return {
		settings,
		canWrite: canWrite === true,
		labels: HELLOASSO_HANDLER_LABELS,
		loadError: error ? 'Les réglages HelloAsso sont illisibles pour le moment.' : null
	};
};

export const actions: Actions = {
	save: async ({ locals, request }) => {
		const form = await request.formData();
		const handler = HELLOASSO_HANDLERS.find((h) => h === text(form, 'handler'));
		if (!handler) {
			return fail(400, { message: 'Campagne inconnue.' });
		}
		const rawCapacity = text(form, 'capacity');
		const setting = {
			handler,
			enabled: text(form, 'enabled') === '1',
			formType: text(form, 'form_type'),
			formSlug: text(form, 'form_slug').toLowerCase(),
			capacity: rawCapacity === '' ? null : Number(rawCapacity)
		};
		const problem = campaignProblem(setting);
		if (problem) {
			return fail(400, { message: problem });
		}

		const error = await saveCampaignSetting(locals.supabase, setting);
		if (error) {
			return fail(400, {
				message: await rejection(locals.supabase, error, "Ce réglage n'a pas pu être enregistré.", {
					entityType: 'helloasso_campaign'
				})
			});
		}
		return { saved: handler };
	}
};
