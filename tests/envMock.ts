/**
 * Module `$app/env/public` ou `$app/env/private` simulé, pour `vi.mock`.
 *
 * Le module généré par SvelteKit exporte chaque variable déclarée dans
 * `src/env.ts`, `undefined` quand elle n'est pas définie. Une factory
 * `vi.mock` ordinaire n'expose que les clés qu'elle renvoie, et Vitest lève une
 * erreur à la lecture de toute autre : or les schémas de `@davincibot/lib/env`
 * lisent toutes leurs variables. Le proxy répond donc `undefined` pour une
 * variable non fournie, et relit `values` à chaque accès : un test peut le
 * modifier (ou en supprimer une clé) après coup.
 */
export const envModule = (
	values: Record<string, string | undefined> = {}
): Record<string, string | undefined> =>
	new Proxy(values, {
		has: (target, key) =>
			key in target || (typeof key === 'string' && /^[A-Z][A-Z0-9_]*$/.test(key))
	});
