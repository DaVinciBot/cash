import { renderPagePdf } from '$lib/server/pdf';
import { documentById } from '$lib/server/reports';
import { DOCUMENT_KIND_LABELS } from '@davincibot/lib';
import { sidCookieName } from '@davincibot/lib/server';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Téléchargement de la pièce en PDF, sous un nom imposé.
//
// La boîte « Enregistrer au format PDF » d'un navigateur n'obéit à aucun
// standard : selon le moteur et le pilote, elle propose le titre du document,
// le dernier segment de l'URL, ou rien du tout. `Content-Disposition`, lui, est
// respecté partout.

/** Nom de fichier lisible, débarrassé de ce qu'un système de fichiers refuse. */
function fileName(kind: keyof typeof DOCUMENT_KIND_LABELS, number: string, recipient: string) {
	return `${DOCUMENT_KIND_LABELS[kind]} ${number} — ${recipient}`
		.replace(/[\\/:*?"<>|]/g, '-')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 120);
}

export const GET: RequestHandler = async ({ cookies, locals, params }) => {
	const id = Number(params.id);
	if (!Number.isSafeInteger(id) || id <= 0) {
		error(404, 'Document introuvable.');
	}

	// La pièce est relue AVANT le rendu : c'est ce qui produit un 404 franc quand
	// elle n'existe pas ou que la policy la refuse, plutôt qu'un PDF d'une page
	// d'erreur. Et c'est de là que vient le nom du fichier.
	const document = await documentById(locals.supabase, id);
	if (!document) {
		error(404, 'Document introuvable.');
	}

	const sid = cookies.get(sidCookieName());
	if (!sid) {
		error(401, 'Session absente.');
	}

	// Le rendu dépend d'un navigateur embarqué : s'il manque à l'image ou tombe,
	// on le dit plutôt que de renvoyer un 500 opaque. La pièce reste consultable
	// et imprimable à l'écran, seul le téléchargement est indisponible.
	let pdf: Uint8Array;
	try {
		pdf = await renderPagePdf(`/admin/treasury/documents/${String(id)}/`, sid);
	} catch {
		// Volontairement sans trace en console : le code serveur du projet n'en
		// écrit nulle part. La cause remonte dans les journaux du conteneur, que
		// Playwright renseigne lui-même quand le navigateur manque.
		error(503, "Le PDF n'a pas pu être produit. La pièce reste imprimable depuis le navigateur.");
	}
	const name = `${fileName(document.kind, document.number, document.recipientName)}.pdf`;

	// `Uint8Array` générique ne satisfait pas `BodyInit` : on passe le tampon
	// sous-jacent, que `Response` accepte tel quel.
	return new Response(pdf.buffer as ArrayBuffer, {
		headers: {
			'content-type': 'application/pdf',
			// Les deux formes cohabitent : `filename` pour les clients anciens, qui
			// ne lisent que l'ASCII, et `filename*` pour les accents. Sans la
			// seconde, « Reçu fiscal » arriverait en « Re?u fiscal ».
			'content-disposition': `attachment; filename="${name.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name)}`,
			// Une pièce émise ne change plus : elle se met en cache sans risque, mais
			// en privé — elle porte des données nominatives.
			'cache-control': 'private, max-age=3600'
		}
	});
};
