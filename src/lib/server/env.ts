import { env } from '$env/dynamic/private';
import {
	defineEnv,
	envCheck,
	optional,
	required,
	withDefault,
	type EnvSchema
} from '@davincibot/lib/env';

/**
 * Variables privées propres à cash. Ce qui est commun aux quatre apps vient de
 * `privateEnv` — voir @davincibot/lib/server.
 */
const schema = {
	// Administration des comptes (invitations, gestion des membres).
	SUPABASE_SECRET_KEY: required(),
	// Adresse par laquelle le serveur s'atteint LUI-MÊME pour produire les PDF :
	// le rendu ouvre la page dans un navigateur embarqué, il lui faut une URL
	// joignable depuis l'intérieur du conteneur — pas l'adresse publique, qui
	// repasserait par le proxy. Absente = boucle locale sur PORT.
	PDF_INTERNAL_BASE: optional(),
	PORT: withDefault('3000')
} satisfies EnvSchema;

export const appServerEnv = defineEnv((key) => env[key], schema);

export const appServerEnvCheck = envCheck((key) => env[key], schema);
