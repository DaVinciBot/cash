// Campagnes HelloAsso réglées depuis l'administration (helloasso-webhooks#1).
//
// Le service `helloasso-webhooks` route chaque paiement vers son handler d'après
// la campagne qui l'a encaissé : la cotisation de l'année, le formulaire du WEI.
// Ces campagnes changent chaque année ; elles se règlent ici, et le service les
// relit en base au plus toutes les minutes. Les secrets (clés HelloAsso, Notion,
// webhook Discord) restent dans l'environnement du service.
//
// Le schéma `helloasso` est fermé à `authenticated` : lecture et écriture passent
// par `cash.helloasso_campaigns` (finance.read) et `cash.set_helloasso_campaign`
// (finance.write).
//
// Typage local : les deux RPC arrivent avec la version de
// `@davincibot/database-types` publiée par DaVinciBot/Supabased (migration
// `20261110090600_helloasso_campaign_settings.sql`). Ce module est le seul
// endroit à retoucher une fois le paquet mis à jour.

import type { Database } from '@davincibot/database-types';
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

type Client = SupabaseClient<Database>;

export const HELLOASSO_HANDLERS = ['membership', 'wei'] as const;
export type HelloAssoHandler = (typeof HELLOASSO_HANDLERS)[number];

export const HELLOASSO_HANDLER_LABELS: Record<HelloAssoHandler, string> = {
	membership: 'Cotisation',
	wei: 'WEI'
};

export interface CampaignSetting {
	handler: HelloAssoHandler;
	enabled: boolean;
	formType: string;
	formSlug: string;
	capacity: number | null;
	updatedAt: string | null;
}

interface CampaignRow {
	handler: string;
	enabled: boolean;
	form_type: string | null;
	form_slug: string | null;
	capacity: number | null;
	updated_at: string;
}

interface CampaignRpc {
	rpc(fn: 'helloasso_campaigns'): PromiseLike<{
		data: CampaignRow[] | null;
		error: PostgrestError | null;
	}>;
	rpc(
		fn: 'set_helloasso_campaign',
		args: {
			p_handler: HelloAssoHandler;
			p_enabled: boolean;
			p_form_type: string;
			p_form_slug: string;
			p_capacity: number | null;
		}
	): PromiseLike<{ error: PostgrestError | null }>;
}

const cash = (supabase: Client) =>
	(supabase as unknown as { schema: (name: 'cash') => CampaignRpc }).schema('cash');

/** Valeurs proposées quand aucune ligne n'existe encore : le service garde alors son environnement. */
const DEFAULTS: Record<HelloAssoHandler, Omit<CampaignSetting, 'handler'>> = {
	membership: {
		enabled: true,
		formType: 'Membership',
		formSlug: '',
		capacity: null,
		updatedAt: null
	},
	wei: { enabled: true, formType: 'Event', formSlug: '', capacity: null, updatedAt: null }
};

export async function campaignSettings(
	supabase: Client
): Promise<{ settings: CampaignSetting[]; error: PostgrestError | null }> {
	const { data, error } = await cash(supabase).rpc('helloasso_campaigns');
	const rows = data ?? [];
	return {
		error,
		settings: HELLOASSO_HANDLERS.map((handler) => {
			const row = rows.find((r) => r.handler === handler);
			return row
				? {
						handler,
						enabled: row.enabled,
						formType: row.form_type ?? '',
						formSlug: row.form_slug ?? '',
						capacity: row.capacity,
						updatedAt: row.updated_at
					}
				: { handler, ...DEFAULTS[handler] };
		})
	};
}

export async function saveCampaignSetting(
	supabase: Client,
	setting: Omit<CampaignSetting, 'updatedAt'>
): Promise<PostgrestError | null> {
	const { error } = await cash(supabase).rpc('set_helloasso_campaign', {
		p_handler: setting.handler,
		p_enabled: setting.enabled,
		p_form_type: setting.formType,
		p_form_slug: setting.formSlug,
		p_capacity: setting.capacity
	});
	return error;
}

/** Problème de saisie d'un réglage, `null` s'il est acceptable. */
export function campaignProblem(setting: Omit<CampaignSetting, 'updatedAt'>): string | null {
	if (setting.formSlug && !/^[a-z0-9][a-z0-9-]*$/.test(setting.formSlug)) {
		return `${HELLOASSO_HANDLER_LABELS[setting.handler]} : le slug est la fin de l'adresse du formulaire HelloAsso (minuscules, chiffres et tirets).`;
	}
	if (
		setting.capacity !== null &&
		(!Number.isSafeInteger(setting.capacity) || setting.capacity <= 0)
	) {
		return `${HELLOASSO_HANDLER_LABELS[setting.handler]} : la capacité est un nombre de places positif.`;
	}
	if (setting.handler === 'wei' && setting.enabled && (!setting.formType || !setting.formSlug)) {
		return 'WEI : un WEI actif exige le type et le slug de son formulaire.';
	}
	return null;
}
