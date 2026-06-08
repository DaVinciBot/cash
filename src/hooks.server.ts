import { createAnonClient, createUserClient, decodeJwt } from '$lib/server/sso';
import type { User } from '@supabase/supabase-js';
import type { Handle, RequestEvent } from '@sveltejs/kit';

interface CachedSession {
	session: App.Locals['session'];
	user: App.Locals['user'];
	timestamp: number;
}

interface ServerSessionRow {
	access_token: string;
	refresh_token: string;
	expires_at: string;
	user_id: string;
	revoked_at: string | null;
}

interface SupabaseQueryResult<T> {
	data: T;
	error: unknown;
}

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

const SESSION_CACHE_TTL_MS = 5 * 60 * 1000;
const SESSION_REFRESH_GRACE_MS = 2 * 60 * 1000;
const sessionCache = new Map<string, CachedSession>();

const getCachedSession = (cacheKey: string) => {
	const cached = sessionCache.get(cacheKey);
	if (!cached) {
		return null;
	}
	if (Date.now() - cached.timestamp > SESSION_CACHE_TTL_MS) {
		sessionCache.delete(cacheKey);
		return null;
	}
	return cached;
};

const clearSessionCookie = (event: RequestEvent) => {
	event.cookies.delete('sid', { path: '/' });
};

export const handle: Handle = async ({ event, resolve }) => {
	const rawSid = event.cookies.get('sid');
	const [sessionId, sessionSecret] = rawSid ? rawSid.split('.') : [null, null];
	let session: App.Locals['session'] = null;
	let user: App.Locals['user'] = null;

	if (sessionId && sessionSecret) {
		const cached = getCachedSession(sessionId);
		if (cached) {
			session = cached.session;
			user = cached.user;
		} else {
			const anon = createAnonClient();
			const sessionResult = (await anon.schema('sso').rpc('get_server_session', {
				p_session_id: sessionId,
				p_session_secret: sessionSecret
			})) as SupabaseQueryResult<ServerSessionRow[] | ServerSessionRow | null>;
			const sessionRow = Array.isArray(sessionResult.data)
				? (sessionResult.data[0] ?? null)
				: sessionResult.data;
			if (sessionResult.error || !sessionRow || sessionRow.revoked_at) {
				clearSessionCookie(event);
			} else {
				const expiresAtMs = new Date(sessionRow.expires_at).getTime();
				let accessToken = sessionRow.access_token;
				let refreshToken = sessionRow.refresh_token;
				let expiresAt = sessionRow.expires_at;

				if (expiresAtMs - Date.now() < SESSION_REFRESH_GRACE_MS) {
					const refreshResult = (await anon.auth.refreshSession({
						refresh_token: refreshToken
					})) as SupabaseQueryResult<{ session: NonNullable<App.Locals['session']> | null }>;
					if (refreshResult.error || !refreshResult.data.session) {
						await anon.schema('sso').rpc('revoke_server_session', {
							p_session_id: sessionId,
							p_session_secret: sessionSecret
						});
						clearSessionCookie(event);
					} else {
						const refreshedSession = refreshResult.data.session;
						const refreshedExpiresAt =
							typeof refreshedSession.expires_at === 'number'
								? refreshedSession.expires_at
								: Math.floor(new Date(expiresAt).getTime() / 1000);
						accessToken = refreshedSession.access_token;
						refreshToken = refreshedSession.refresh_token;
						expiresAt = new Date(refreshedExpiresAt * 1000).toISOString();
						await anon.schema('sso').rpc('update_server_session_tokens', {
							p_session_id: sessionId,
							p_session_secret: sessionSecret,
							p_access_token: accessToken,
							p_refresh_token: refreshToken,
							p_expires_at: expiresAt
						});
						const jwt = decodeJwt(accessToken);
						session = {
							id: sessionId,
							access_token: accessToken,
							refresh_token: refreshToken,
							expires_at: refreshedExpiresAt,
							user_id: jwt?.sub ?? sessionRow.user_id
						};
						user = jwt
							? createSessionUser({
									id: jwt.sub,
									email: jwt.email ?? null,
									appMetadata: jwt.app_metadata ?? {},
									userMetadata: jwt.user_metadata ?? {}
								})
							: createSessionUser({ id: sessionRow.user_id, email: null });
						if (sessionId) {
							sessionCache.set(sessionId, { session, user, timestamp: Date.now() });
						}
					}
				} else {
					const jwt = decodeJwt(accessToken);
					session = {
						id: sessionId,
						access_token: accessToken,
						refresh_token: refreshToken,
						expires_at: Math.floor(new Date(expiresAt).getTime() / 1000),
						user_id: jwt?.sub ?? sessionRow.user_id
					};
					user = jwt
						? createSessionUser({
								id: jwt.sub,
								email: jwt.email ?? null,
								appMetadata: jwt.app_metadata ?? {},
								userMetadata: jwt.user_metadata ?? {}
							})
						: createSessionUser({ id: sessionRow.user_id, email: null });
					sessionCache.set(sessionId, { session, user, timestamp: Date.now() });
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

	return resolve(event, {
		filterSerializedResponseHeaders(name: string) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
