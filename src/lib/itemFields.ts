// Règles de saisie communes à la création et à la modification d'un item.
//
// Le lien et au moins un tag d'équipe sont obligatoires : sans lien, la
// trésorerie ne sait pas quoi commander ; sans tag, le pôle concerné (méca,
// info, élek) ne retrouve pas ses demandes. Le navigateur bloque déjà la saisie,
// mais le serveur revérifie : un formulaire soumis hors de la page ne doit pas
// contourner la règle.

import { ITEM_TAGS, type ItemTag } from '#lib/types/domain.js';

/** Vrai pour une URL absolue en http ou https, la seule forme commandable. */
export function isHttpUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
}

/** Ne garde que les tags connus, sans doublon : une valeur inconnue ne compte pas. */
export function knownTags(tags: readonly unknown[]): ItemTag[] {
	return ITEM_TAGS.filter((tag) => tags.includes(tag));
}

/**
 * Message d'erreur pour un lien ou des tags invalides, `null` si la saisie est
 * complète. `prefix` situe la ligne fautive dans un panier (« Ligne 2 : »).
 */
export function itemFieldsError(
	link: string,
	tags: readonly ItemTag[],
	prefix = ''
): string | null {
	const problem = !link
		? 'le lien est obligatoire.'
		: !isHttpUrl(link)
			? 'le lien doit être une adresse web complète (https://…).'
			: tags.length === 0
				? `choisissez au moins un tag d'équipe (${ITEM_TAGS.join(', ')}).`
				: null;
	if (!problem) {
		return null;
	}
	return prefix ? `${prefix}${problem}` : problem.charAt(0).toUpperCase() + problem.slice(1);
}
