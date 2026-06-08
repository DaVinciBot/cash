import { createAnonClient, createUserClient, decodeJwt } from '$lib/server/sso';

interface CachedSession {
	session: any;
	user: any;
	timestamp: number;
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

const clearSessionCookie = (event: any) => {
	event.cookies.delete('sid', { path: '/' });
};

export const handle = async ({ event, resolve }: any) => {
	const rawSid = event.cookies.get('sid');
	const [sessionId, sessionSecret] = rawSid ? rawSid.split('.') : [null, null];
	let session: any = null;
	let user: any = null;

	if (sessionId && sessionSecret) {
		const cached = getCachedSession(sessionId);
		if (cached) {
			session = cached.session;
			user = cached.user;
		} else {
			const anon = createAnonClient();
			const { data, error } = await anon.schema('sso').rpc('get_server_session', {
				p_session_id: sessionId,
				p_session_secret: sessionSecret
			});
			const sessionRow = Array.isArray(data) ? data[0] : data;
			if (error || !sessionRow || sessionRow.revoked_at) {
				clearSessionCookie(event);
			} else {
				const expiresAtMs = new Date(sessionRow.expires_at).getTime();
				let accessToken = sessionRow.access_token;
				let refreshToken = sessionRow.refresh_token;
				let expiresAt = sessionRow.expires_at;

				if (expiresAtMs - Date.now() < SESSION_REFRESH_GRACE_MS) {
					const { data: refreshed, error: refreshError } = await anon.auth.refreshSession({
						refresh_token: refreshToken
					});
					if (refreshError || !refreshed?.session) {
						await anon.schema('sso').rpc('revoke_server_session', {
							p_session_id: sessionId,
							p_session_secret: sessionSecret
						});
						clearSessionCookie(event);
					} else {
						const refreshedExpiresAt =
							typeof refreshed.session.expires_at === 'number'
								? refreshed.session.expires_at
								: Math.floor(new Date(expiresAt).getTime() / 1000);
						accessToken = refreshed.session.access_token;
						refreshToken = refreshed.session.refresh_token;
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
							? {
									id: jwt.sub,
									email: jwt.email,
									app_metadata: jwt.app_metadata ?? {},
									user_metadata: jwt.user_metadata ?? {}
								}
							: { id: sessionRow.user_id, email: null, app_metadata: {}, user_metadata: {} };
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
						? {
								id: jwt.sub,
								email: jwt.email,
								app_metadata: jwt.app_metadata ?? {},
								user_metadata: jwt.user_metadata ?? {}
							}
						: { id: sessionRow.user_id, email: null, app_metadata: {}, user_metadata: {} };
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

	event.locals.safeGetSession = async () => {
		return { session, user };
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name: string) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
