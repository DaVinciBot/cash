import { env } from '$env/dynamic/public';

type SessionInfo = NonNullable<App.Locals['session']>;

export interface ResolvedAuthUser {
	id: string;
	email: string | null;
	app_metadata: Record<string, unknown>;
	user_metadata: Record<string, unknown>;
}

export type ResolveResult =
	| { status: 'ok'; session: SessionInfo; user: ResolvedAuthUser }
	| { status: 'invalid' }
	| { status: 'unavailable' };

const authBase = (): string =>
	(env.PUBLIC_AUTH_BASE_URL || 'https://auth.davincibot.fr').replace(/\/$/, '');

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

const parsePayload = (
	payload: unknown
): { session: SessionInfo; user: ResolvedAuthUser } | null => {
	if (!isRecord(payload) || !isRecord(payload.session) || !isRecord(payload.user)) {
		return null;
	}
	const s = payload.session;
	const u = payload.user;
	if (
		typeof s.id !== 'string' ||
		typeof s.user_id !== 'string' ||
		typeof s.access_token !== 'string' ||
		typeof s.expires_at !== 'number' ||
		typeof u.id !== 'string'
	) {
		return null;
	}
	return {
		session: {
			id: s.id,
			user_id: s.user_id,
			access_token: s.access_token,
			expires_at: s.expires_at
		},
		user: {
			id: u.id,
			email: typeof u.email === 'string' ? u.email : null,
			app_metadata: isRecord(u.app_metadata) ? u.app_metadata : {},
			user_metadata: isRecord(u.user_metadata) ? u.user_metadata : {}
		}
	};
};

/**
 * Résout la session auprès du service auth central : c'est lui qui détient les
 * tokens et fait le refresh (sous single-flight). Le site ne voit passer que
 * l'access token, jamais le refresh token.
 */
export const resolveSessionViaAuth = async (
	fetchFn: typeof fetch,
	rawSid: string
): Promise<ResolveResult> => {
	try {
		const response = await fetchFn(`${authBase()}/session/resolve`, {
			method: 'POST',
			headers: { cookie: `sid=${rawSid}` }
		});
		if (response.status === 401) {
			return { status: 'invalid' };
		}
		if (!response.ok) {
			return { status: 'unavailable' };
		}
		const parsed = parsePayload(await response.json());
		if (!parsed) {
			return { status: 'unavailable' };
		}
		return { status: 'ok', ...parsed };
	} catch {
		return { status: 'unavailable' };
	}
};
