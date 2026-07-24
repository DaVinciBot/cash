import { vi } from 'vitest';

// @davincibot/lib importe les modules virtuels de SvelteKit ($env, $app) au
// niveau des modules (ex. config/auth lit `$env/dynamic/public` à l'import du
// barrel). Vitest n'exécute pas le plugin SvelteKit sur ces modules virtuels,
// donc on les stub globalement pour toute la suite. Les valeurs PUBLIC_*
// reprennent le .env pour que buildLoginUrl / getSupabaseBrowserClient aient
// des valeurs réalistes.
const publicEnv = {
	PUBLIC_SUPABASE_URL: 'https://tlqaurcfisqkzhdzkdrk.supabase.co',
	PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
	PUBLIC_AUTH_BASE_URL: 'https://auth.davincibot.fr',
	PUBLIC_COOKIE_PREFIX: ''
};

vi.mock('$env/dynamic/public', () => ({ env: publicEnv }));
vi.mock('$env/static/public', () => publicEnv);

vi.mock('$app/environment', () => ({
	browser: true,
	dev: false,
	building: false,
	version: 'test'
}));

// $app/paths n'est PAS stub : le plugin SvelteKit le résout avec le vrai base
// path (/admin), dont dépendent les endpoints (resolve('/api/...') →
// '/admin/api/...').
