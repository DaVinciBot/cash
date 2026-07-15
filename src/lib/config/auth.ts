import { env } from '$env/dynamic/public';

const authBase = (): string =>
	(env.PUBLIC_AUTH_BASE_URL || 'https://auth.davincibot.fr').replace(/\/$/, '');

export const buildLoginUrl = (redirectTo: string): string =>
	`${authBase()}/login?redirect=${encodeURIComponent(redirectTo)}`;

export const buildLogoutUrl = (redirectTo: string): string =>
	`${authBase()}/logout?redirect=${encodeURIComponent(redirectTo)}`;
