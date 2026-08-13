import { documentList, missingIssuerFields, organization } from '$lib/server/reports';
import { DOCUMENT_KINDS } from '@davincibot/lib';
import type { PageServerLoad } from './$types';

// Documents générés (TRESO-F-40 à 43) — la LISTE, et rien d'autre.
//
// L'émission vit dans `new/`, l'identité de l'émetteur dans `issuer/`. Les trois
// étaient auparavant empilés sur cet écran, en panneaux dépliants : on ne savait
// plus si l'on configurait l'association ou si l'on créait une pièce.
//
// Un document est ÉMIS, pas rendu à la demande : il fige à l'écriture son
// montant, son destinataire, ses lignes et l'identité de l'émetteur. La page
// d'impression ne fait que relire. C'est ce qui permet de rejouer une facture
// deux ans plus tard telle qu'elle est partie, même si l'association a déménagé
// et si la commande a été corrigée depuis.

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('cash:documents');

	const [documents, org] = await Promise.all([
		documentList(locals.supabase),
		organization(locals.supabase)
	]);

	// Une identité incomplète bloque l'émission : on le dit sur la liste plutôt
	// que d'attendre le bouton « Émettre » pour refuser.
	const blocked = DOCUMENT_KINDS.filter((k) => missingIssuerFields(org, k).length > 0);

	return { documents, issuerReady: blocked.length === 0 };
};
