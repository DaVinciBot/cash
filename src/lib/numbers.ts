// Arrondi commun aux montants et aux durées, côté client ET serveur.
//
// Les deux se comptent en centièmes — euros et centimes, heures et quarts
// d'heure — et les deux dérivent sans arrondi : une somme de `0.25` finit par
// afficher `10.750000000000002`, un total TTC par valoir un centime de trop.
// Redéfini fichier par fichier, cet arrondi finirait par différer d'un écran à
// l'autre pour la même somme.

/** Arrondi au centième. */
export function round(value: number): number {
	return Math.round(value * 100) / 100;
}
