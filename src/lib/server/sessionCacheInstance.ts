import { SessionCache } from '@davincibot/lib/server';
import type { User } from '@supabase/supabase-js';

const SESSION_CACHE_TTL_MS = 5 * 60 * 1000;
const SESSION_STALE_MAX_AGE_MS = 15 * 60 * 1000;

// Instance unique partagée entre les hooks (résolution de session) et les proxys
// de révocation (invalidation immédiate) : une seule réplique du serveur, un seul cache.
export const sessionCache = new SessionCache<NonNullable<App.Locals['session']>, User>(
	SESSION_CACHE_TTL_MS,
	SESSION_STALE_MAX_AGE_MS
);
