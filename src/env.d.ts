// SvelteKit 3 ne génère plus les types de `$env/dynamic/*` (remplacés par
// `$app/env/*`). Ces modules fonctionnent encore à l'exécution : on déclare ici
// leur forme, indépendante de la présence d'un `.env`.
declare module '$env/dynamic/public' {
	export const env: Record<string, string | undefined>;
}

declare module '$env/dynamic/private' {
	export const env: Record<string, string | undefined>;
}
