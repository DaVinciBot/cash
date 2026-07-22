import { createAnonClient, createUserClient, resolveSessionViaAuth, sidCookieName } from '@davincibot/lib/server';
import { resolve as resolveRoute } from '$app/paths';
import { buildLoginUrl } from '@davincibot/lib';
import { sessionCache } from '$lib/server/sessionCacheInstance';
import type { User } from '@supabase/supabase-js';
import { error, redirect, type Handle, type RequestEvent } from '@sveltejs/kit';

function createSessionUser({
	id,
	email,
	appMetadata = {},
	userMetadata = {}
}: {
	id: string;
	email: string | null;
	appMetadata?: Record<string, unknown>;
	userMetadata?: Record<string, unknown>;
}): User {
	return {
		id,
		aud: 'authenticated',
		role: 'authenticated',
		email: email ?? undefined,
		app_metadata: appMetadata,
		user_metadata: userMetadata,
		created_at: '',
		updated_at: ''
	};
}

const clearSessionCookie = (event: RequestEvent) => {
	event.cookies.delete(sidCookieName(), { path: '/' });
};

/**
 * Garde d'accès aux environnements dev.* : exige d'être authentifié ET de
 * détenir infra.environments.access (résolu côté DB via has_permission, qui
 * unit rôles globaux actifs + override). Un utilisateur non connecté est
 * redirigé vers le SSO ; connecté sans la permission -> 403.
 */
async function guardDevEnvironment(
	event: RequestEvent,
	session: App.Locals['session'],
	user: App.Locals['user']
): Promise<void> {
	// Endpoints d'authentification locaux (ex. /auth/logout) : laissés
	// accessibles pour ne pas bloquer la déconnexion sur dev.*.
	if (event.url.pathname.startsWith('/auth/')) {
		return;
	}

	// Health check du déploiement : public, ne divulgue rien.
	if (event.url.pathname === resolveRoute('/health')) {
		return;
	}

	if (!session || !user) {
		// Un fetch vers l'API ne peut pas suivre la redirection vers la page de
		// login (il la suivrait en GET) : 401 explicite, traité côté client.
		if (event.url.pathname.startsWith(resolveRoute('/api'))) {
			error(401, 'Non authentifié');
		}
		redirect(302, buildLoginUrl(event.url.href));
	}

	const result = (await event.locals.supabase.rpc('has_permission', {
		p_permission: 'infra.environments.access'
	})) as { data: boolean | null; error: unknown };

	if (result.error || !result.data) {
		error(
			403,
			"Accès réservé à l'environnement de développement (infra.environments.access requis)."
		);
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	const rawSid = event.cookies.get(sidCookieName());
	const [sessionId, sessionSecret] = rawSid ? rawSid.split('.') : [null, null];
	let session: App.Locals['session'] = null;
	let user: App.Locals['user'] = null;

	if (rawSid && sessionId && sessionSecret) {
		const cached = sessionCache.getFresh(sessionId, sessionSecret);
		if (cached) {
			session = cached.session;
			user = cached.user;
		} else {
			const result = await resolveSessionViaAuth(event.fetch, rawSid);
			if (result.status === 'ok') {
				session = result.session;
				user = createSessionUser({
					id: result.user.id,
					email: result.user.email,
					appMetadata: result.user.app_metadata,
					userMetadata: result.user.user_metadata
				});
				sessionCache.set(sessionId, session, user, sessionSecret);
			} else if (result.status === 'invalid') {
				clearSessionCookie(event);
			} else {
				// Service auth injoignable : on ressert l'entrée périmée du cache
				// tant que l'access token est encore valable, sans purger le cookie.
				const stale = sessionCache.getStale(sessionId, sessionSecret);
				if (stale) {
					session = stale.session;
					user = stale.user;
				}
			}
		}
	}

	if (session?.access_token) {
		event.locals.supabase = createUserClient(session.access_token);
	} else {
		event.locals.supabase = createAnonClient();
	}

	event.locals.session = session;
	event.locals.user = user;
	event.locals.permissions = [];

	event.locals.safeGetSession = () => Promise.resolve({ session, user });

	// Environnements de pré-production (dev.*) : accès réservé aux utilisateurs
	// authentifiés détenant infra.environments.access. Enforcement applicatif en
	// complément du reverse proxy. Le hostname dev.* couvre dev.davincibot.fr et
	// les sous-domaines dev.* des autres apps.
	if (event.url.hostname.startsWith('dev.')) {
		await guardDevEnvironment(event, session, user);
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name: string) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
