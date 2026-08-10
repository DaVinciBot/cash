import { decimal, text } from '$lib/server/form';
import { accounts, balancesOn, movementsBetween, periods } from '$lib/server/treasury';
import { ACCOUNT_KINDS, cashErrorMessage, type AccountKind } from '@davincibot/lib';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Tableau de bord de trésorerie : soldes à une date (TRESO-F-51), mouvements
// entre deux dates (TRESO-F-52), comptes et périodes.
//
// Les deux dates sont dans l'URL et non dans un état local : un solde à une
// date se partage et se recharge, et c'est ce que le trésorier fera pour le
// confronter à son relevé.

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Date du jour au format ISO, dans le fuseau local du serveur. */
function today(): string {
	return new Date().toISOString().slice(0, 10);
}

function day(value: string | null, fallback: string): string {
	return value && ISO_DAY.test(value) ? value : fallback;
}

export const load: PageServerLoad = async ({ locals, url, depends }) => {
	depends('cash:treasury');

	const now = today();
	const firstOfMonth = `${now.slice(0, 7)}-01`;

	const on = day(url.searchParams.get('on'), now);
	const from = day(url.searchParams.get('from'), firstOfMonth);
	const to = day(url.searchParams.get('to'), now);

	const [accountRows, snapshots, movements, periodRows] = await Promise.all([
		accounts(locals.supabase),
		balancesOn(locals.supabase, on),
		movementsBetween(locals.supabase, from, to),
		periods(locals.supabase)
	]);

	return { accounts: accountRows, snapshots, movements, periods: periodRows, on, from, to };
};

export const actions: Actions = {
	/** Création d'un compte — courant, épargne, ou enveloppe de partenariat (TRESO-F-11). */
	createAccount: async ({ locals, request }) => {
		const form = await request.formData();
		const name = text(form, 'name');
		const kind = text(form, 'kind');
		const opening = decimal(form, 'opening_balance');

		if (name.length === 0) {
			return fail(400, { message: 'Le nom du compte est obligatoire.' });
		}
		if (!ACCOUNT_KINDS.includes(kind as AccountKind)) {
			return fail(400, { message: 'Type de compte inconnu.' });
		}
		if (!Number.isFinite(opening)) {
			return fail(400, { message: 'Le solde d’ouverture doit être un montant.' });
		}

		const { error } = await locals.supabase
			.schema('cash')
			.from('bank_accounts')
			.insert({ name, kind: kind as AccountKind, opening_balance: opening });

		if (error) {
			return fail(400, {
				message: cashErrorMessage(error.code, 'Ce compte n’a pas pu être créé.')
			});
		}
		return { saved: 'account' };
	},

	/**
	 * Archivage d'un compte, et retour en arrière.
	 *
	 * Jamais de suppression : les flux le référencent, et l'historique d'un
	 * compte fermé reste ce qui explique un solde passé. L'archivage le retire
	 * des sélecteurs — saisie d'un mouvement, règlement d'une commande — sans
	 * toucher à ce qui s'y rattache déjà.
	 *
	 * Le geste se confirme à l'écran avant d'arriver ici. Le serveur ne redouble
	 * pas cette garde : une confirmation est une affaire d'interface, et la
	 * rejouer côté serveur reviendrait à inventer un jeton que rien ne vérifie.
	 * Ce qu'il garantit, lui, c'est la réversibilité.
	 */
	toggleArchiveAccount: async ({ locals, request }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		const archive = text(form, 'archive') === '1';
		if (!Number.isSafeInteger(id)) {
			return fail(400, { message: 'Compte invalide.' });
		}

		const { error } = await locals.supabase
			.schema('cash')
			.from('bank_accounts')
			.update({ archived_at: archive ? new Date().toISOString() : null })
			.eq('id', id);

		if (error) {
			return fail(400, {
				message: cashErrorMessage(
					error.code,
					archive ? 'Ce compte n’a pas pu être archivé.' : 'Ce compte n’a pas pu être réactivé.'
				)
			});
		}
		return { saved: 'account' };
	},

	/**
	 * Ouverture d'une période — année scolaire ou exercice fiscal (§7.1bis).
	 *
	 * Sans cet écran, personne ne peut ouvrir l'année suivante et le premier item
	 * de septembre n'a aucune année où se rattacher : `items.school_year_id` est
	 * NOT NULL et aucun trigger ne le devine.
	 */
	createPeriod: async ({ locals, request }) => {
		const form = await request.formData();
		const kind = text(form, 'kind');
		const label = text(form, 'label');
		const startsOn = text(form, 'starts_on');
		const endsOn = text(form, 'ends_on');

		if (kind !== 'school' && kind !== 'fiscal') {
			return fail(400, { message: 'Type de période inconnu.' });
		}
		if (label.length === 0) {
			return fail(400, { message: 'Le libellé est obligatoire.' });
		}
		if (!ISO_DAY.test(startsOn) || !ISO_DAY.test(endsOn) || endsOn <= startsOn) {
			return fail(400, { message: 'La date de fin doit suivre la date de début.' });
		}

		const { error } = await locals.supabase
			.schema('cash')
			.from(kind === 'school' ? 'school_years' : 'fiscal_years')
			.insert({ label, starts_on: startsOn, ends_on: endsOn });

		if (error) {
			return fail(400, {
				message: cashErrorMessage(error.code, 'Cette période n’a pas pu être ouverte.')
			});
		}
		return { saved: 'period' };
	},

	/** Clôture ou réouverture d'une période (TRANS-NF-31/32). */
	togglePeriod: async ({ locals, request }) => {
		const form = await request.formData();
		const kind = text(form, 'kind');
		const id = Number(form.get('id'));
		const close = text(form, 'close') === '1';

		if (kind !== 'school' && kind !== 'fiscal') {
			return fail(400, { message: 'Type de période inconnu.' });
		}
		if (!Number.isSafeInteger(id)) {
			return fail(400, { message: 'Période invalide.' });
		}

		const { error } = await locals.supabase
			.schema('cash')
			.from(kind === 'school' ? 'school_years' : 'fiscal_years')
			.update({ closed_at: close ? new Date().toISOString() : null })
			.eq('id', id);

		if (error) {
			return fail(400, {
				message: cashErrorMessage(error.code, 'Cette période n’a pas pu être modifiée.')
			});
		}
		return { saved: 'period' };
	}
};
