import { env } from '$env/dynamic/public';

// Ternaire (pas ||) : la nullabilité de env.* dépend de la présence d'un .env,
// un || ne linte pas pareil en CI et en local.
const authBase = (): string => {
	const raw = env.PUBLIC_AUTH_BASE_URL;
	return raw ? raw.replace(/\/$/, '') : 'https://auth.davincibot.fr';
};

export const buildLoginUrl = (redirectTo: string): string =>
	`${authBase()}/login?redirect=${encodeURIComponent(redirectTo)}`;

export const buildLogoutUrl = (redirectTo: string): string =>
	`${authBase()}/logout?redirect=${encodeURIComponent(redirectTo)}`;
