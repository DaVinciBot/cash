import { documentById } from '$lib/server/reports';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Rendu d'un document émis (TRESO-F-40 à 43).
//
// Tout vient du document lui-même — montant, destinataire, lignes, émetteur —
// et rien des lignes vivantes : c'est ce qui permet de rejouer une facture deux
// ans plus tard telle qu'elle est partie, même si l'association a déménagé
// depuis. La page est faite pour être imprimée en PDF depuis le navigateur.

export const load: PageServerLoad = async ({ depends, locals, params }) => {
	depends('cash:document');

	const id = Number(params.id);
	if (!Number.isSafeInteger(id) || id <= 0) {
		error(404, 'Document introuvable.');
	}

	const document = await documentById(locals.supabase, id);
	if (!document) {
		error(404, 'Document introuvable.');
	}

	return { document };
};
