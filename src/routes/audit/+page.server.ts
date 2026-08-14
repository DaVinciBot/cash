import { businessJournal, rejectedWrites, socleJournal } from '$lib/server/audit';
import type { PageServerLoad } from './$types';

// Écran d'audit (TRANS-NF-51/52).
//
// Trois journaux, un seul écran, un onglet chacun. L'onglet est dans l'URL et
// non dans un état local : un journal se partage — « regarde ce qui a été refusé
// mardi » est un lien, pas une suite de clics.
//
// Aucun contrôle de permission ici. `audit.logs.read` est exigée par la garde de
// route ET par les policies des six tables : un lecteur non autorisé n'arriverait
// pas jusqu'ici, et s'il y arrivait, il verrait trois tableaux vides. Redoubler
// la règle en TypeScript créerait un troisième endroit à tenir aligné.

const TABS = ['socle', 'metier', 'rejets'] as const;

type Tab = (typeof TABS)[number];

export const load: PageServerLoad = async ({ depends, locals, url }) => {
	depends('cash:audit');

	const asked = url.searchParams.get('tab');
	const tab: Tab = TABS.includes(asked as Tab) ? (asked as Tab) : 'socle';
	const entityType = url.searchParams.get('entity') ?? undefined;
	const sqlstate = url.searchParams.get('code') ?? undefined;

	// Un seul journal est chargé : les deux autres sont derrière un onglet que
	// personne ne regarde encore, et les trois ensemble feraient trois cents
	// lignes à chaque affichage.
	if (tab === 'metier') {
		return {
			tab,
			entityType,
			sqlstate,
			socle: [],
			business: await businessJournal(locals.supabase, { entityType }),
			rejected: []
		};
	}

	if (tab === 'rejets') {
		return {
			tab,
			entityType,
			sqlstate,
			socle: [],
			business: [],
			rejected: await rejectedWrites(locals.supabase, { sqlstate })
		};
	}

	return {
		tab,
		entityType,
		sqlstate,
		socle: await socleJournal(locals.supabase, { entityType }),
		business: [],
		rejected: []
	};
};
