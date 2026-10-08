import { defineEnvVars } from '@sveltejs/kit/env';

// SvelteKit 3 n'expose une variable d'environnement que si elle est déclarée ici.
// Les valeurs sont lues à l'exécution ; leur validation (présence, format) reste
// celle des schémas de `@davincibot/lib/env`, appelés par `assertEnv` au boot.
// Le validateur ci-dessous laisse tout passer : sans lui Kit refuserait, au build,
// une variable absente, alors que `assertEnv` doit pouvoir la signaler au boot.
// À tenir alignée avec ces schémas : une variable absente d'ici serait `undefined`.
const passthrough = (value: string | undefined) => value;

export const variables = defineEnvVars({
	PUBLIC_SUPABASE_URL: { public: true, schema: passthrough },
	PUBLIC_SUPABASE_PUBLISHABLE_KEY: { public: true, schema: passthrough },
	PUBLIC_AUTH_BASE_URL: { public: true, schema: passthrough },
	PUBLIC_COOKIE_PREFIX: { public: true, schema: passthrough },
	PUBLIC_ROOT_DOMAIN: { public: true, schema: passthrough },
	PUBLIC_AUTH_ORIGIN: { public: true, schema: passthrough },
	SUPABASE_SECRET_KEY: { schema: passthrough },
	WEBAUTHN_RP_ID: { schema: passthrough },
	WEBAUTHN_RP_NAME: { schema: passthrough },
	WEBAUTHN_ORIGINS: { schema: passthrough },
	DEV_RBAC_PANEL: { schema: passthrough },
	DEV_RBAC_SNAPSHOTS_PATH: { schema: passthrough },
	DEV_RBAC_ALLOWED_PROJECT_REFS: { schema: passthrough },
	DEV_RBAC_ALLOWED_USER_IDS: { schema: passthrough },
	PDF_INTERNAL_BASE: { schema: passthrough },
	PORT: { schema: passthrough }
});
