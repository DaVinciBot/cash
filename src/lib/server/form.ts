// Lecture typée d'un FormData.
//
// `FormData.get()` renvoie `string | File | null`. Passer ce résultat à
// `String()` compile, mais stringifie un fichier en `[object File]` : une saisie
// tordue se retrouverait enregistrée telle quelle au lieu d'être rejetée. Ces
// helpers écartent les entrées non textuelles au lieu de les convertir.

/** Valeur texte d'un champ, vide si absent ou si le champ porte un fichier. */
export function text(form: FormData, key: string): string {
	const value = form.get(key);
	return typeof value === 'string' ? value.trim() : '';
}

/** Toutes les valeurs texte d'un champ répété, dans l'ordre du formulaire. */
export function textAll(form: FormData, key: string): string[] {
	return form.getAll(key).map((value) => (typeof value === 'string' ? value : ''));
}

/**
 * Nombre décimal saisi à la française : la virgule vaut un point.
 * Renvoie `NaN` si le champ n'est pas un nombre — au l'appelant de trancher.
 */
export function decimal(form: FormData, key: string): number {
	return Number(text(form, key).replace(',', '.'));
}

/**
 * Tableau de tags transporté en JSON.
 *
 * Les tags sont multi-valués PAR LIGNE de panier : les envoyer en champs répétés
 * les ferait aplatir par `getAll()` et on perdrait à quelle ligne chacun
 * appartient. Une entrée illisible vaut tableau vide : un tag est un confort de
 * classement, il ne justifie pas de refuser la demande.
 */
export function jsonArray<T>(raw: string): T[] {
	try {
		const parsed: unknown = JSON.parse(raw || '[]');
		return Array.isArray(parsed) ? (parsed as T[]) : [];
	} catch {
		return [];
	}
}
