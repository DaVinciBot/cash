import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';

type CachedSession = {
	session: any;
	user: any;
	timestamp: number;
};

const SESSION_CACHE_TTL_MS = 5 * 60 * 1000;
const sessionCache = new Map<string, CachedSession>();

const getCachedSession = (cacheKey: string) => {
	const cached = sessionCache.get(cacheKey);
	if (!cached) return null;
	if (Date.now() - cached.timestamp > SESSION_CACHE_TTL_MS) {
		sessionCache.delete(cacheKey);
		return null;
	}
	return cached;
};

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
		cookies: {
			getAll() {
				return event.cookies.getAll();
			},
			setAll(cookiesToSet) {
				/**
				 * Note: You have to add the `path` variable to the
				 * set and remove method due to sveltekit's cookie API
				 * requiring this to be set, setting the path to an empty string
				 * will replicate previous/standard behavior (https://kit.svelte.dev/docs/types#public-types-cookies)
				 */
				cookiesToSet.forEach(({ name, value, options }) =>
					event.cookies.set(name, value, { ...options, path: '/' })
				);
			}
		}
	});

	/**
	 * Unlike `supabase.auth.getSession()`, which returns the session _without_
	 * validating the JWT, this function also calls `getUser()` to validate the
	 * JWT before returning the session.
	 */
	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		if (!session) {
			return { session: null, user: null };
		}

		const cacheKey = session.access_token;
		if (cacheKey) {
			const cached = getCachedSession(cacheKey);
			if (cached) {
				return { session: cached.session, user: cached.user };
			}
		}

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();
		if (error) {
			// JWT validation has failed
			if (error?.message?.includes('session id') || error?.message?.includes("doesn't exist")) {
				try {
					await event.locals.supabase.auth.signOut();
				} catch {
					// ignore
				}
			}
			return { session: null, user: null };
		}

		if (cacheKey) {
			sessionCache.set(cacheKey, { session, user, timestamp: Date.now() });
		}

		return { session, user };
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
