import { CAMPUS_BADGES, type Campus } from '@davincibot/lib';

/**
 * Clés des champs du profil dans la fiche membre.
 *
 * RecordModal nomme ses contrôles `field.id ?? field.name.toLowerCase()` : le
 * libellé affiché n'est donc pas la clé de la FormData. Les définitions de
 * champs et la relecture partagent cette constante, jamais le libellé — sinon
 * `formData.get()` rend `null` et la RPC comprend « ne touche pas ».
 */
export const PROFILE_FIELD_KEYS = {
	username: 'username',
	campus: 'campus'
} as const;

export interface ProfileEdits {
	username?: string;
	campus?: Campus;
}

/**
 * Champs réellement présentés à l'utilisateur. Un champ absent ne doit jamais
 * être lu comme « sélection vide » : la RPC effacerait ce qu'elle était censée
 * laisser intact.
 */
export interface PresentedProfileFields {
	username: boolean;
	campus: boolean;
}

/** Définitions des champs nom et campus de la fiche membre (RecordModal). */
export function buildProfileFields() {
	return [
		{
			name: 'Nom',
			id: PROFILE_FIELD_KEYS.username,
			type: 'text',
			placeholder: 'Rob, aka Robert',
			required: true,
			wide: true
		},
		{
			name: 'Campus',
			id: PROFILE_FIELD_KEYS.campus,
			type: 'select',
			options: (Object.keys(CAMPUS_BADGES) as Campus[]).map((value) => ({
				value,
				text: CAMPUS_BADGES[value].label
			}))
		}
	];
}

/** Lecture du formulaire de la fiche membre. */
export function readProfileEdits(
	formData: FormData,
	presented: PresentedProfileFields
): ProfileEdits {
	const edits: ProfileEdits = {};
	if (presented.username) {
		const raw = formData.get(PROFILE_FIELD_KEYS.username);
		edits.username = typeof raw === 'string' ? raw : '';
	}
	if (presented.campus) {
		// Le sélecteur rend 'NULL' quand rien n'est choisi : la RPC lit NULL comme
		// « ne pas toucher », ce qui évite d'effacer un campus en rouvrant la fiche.
		const raw = formData.get(PROFILE_FIELD_KEYS.campus);
		edits.campus = typeof raw === 'string' && raw in CAMPUS_BADGES ? (raw as Campus) : undefined;
	}
	return edits;
}
