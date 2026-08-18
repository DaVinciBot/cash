import { missingIssuerFields, organization } from '$lib/server/reports';
import { DOCUMENT_KINDS } from '@davincibot/lib';
import type { PageServerLoad } from './$types';

// Étape 1 — quel document veut-on faire.
//
// Le choix vient AVANT la saisie, parce qu'il commande le reste : une note de
// frais demande un IBAN de bénéficiaire, un reçu fiscal la nature du don, un
// devis ni l'un ni l'autre. Un formulaire unique qui montre et cache ses champs
// selon un menu déroulant oblige à comprendre la mécanique avant de comprendre
// la pièce.

export const load: PageServerLoad = async ({ locals }) => {
	const org = await organization(locals.supabase);
	return {
		missingByKind: Object.fromEntries(DOCUMENT_KINDS.map((k) => [k, missingIssuerFields(org, k)]))
	};
};
