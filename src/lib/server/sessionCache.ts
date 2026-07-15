import { createHash, timingSafeEqual } from 'node:crypto';

export interface SessionCacheEntry<TSession, TUser> {
	session: TSession;
	user: TUser;
	timestamp: number;
	secretHash: string;
}

export const hashSecret = (secret: string): string =>
	createHash('sha256').update(secret).digest('hex');

const secretMatches = (a: string, b: string): boolean => {
	const bufA = Buffer.from(a);
	const bufB = Buffer.from(b);
	return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
};

/**
 * Cache mémoire des sessions, lié au secret : un même sessionId présenté avec
 * un secret différent ne réutilise jamais l'entrée (sinon le secret ne serait
 * plus vérifié). Les entrées restent lisibles au-delà du TTL (jusqu'à
 * staleMaxAgeMs) pour resservir une session quand le service auth est
 * injoignable, tant que l'access token n'est pas expiré.
 */
export class SessionCache<TSession extends { expires_at: number }, TUser> {
	private readonly entries = new Map<string, SessionCacheEntry<TSession, TUser>>();

	constructor(
		private readonly ttlMs: number,
		private readonly staleMaxAgeMs: number
	) {}

	set(key: string, session: TSession, user: TUser, secret: string): void {
		this.entries.set(key, {
			session,
			user,
			timestamp: Date.now(),
			secretHash: hashSecret(secret)
		});
	}

	getFresh(key: string, secret: string): SessionCacheEntry<TSession, TUser> | null {
		return this.read(key, secret, this.ttlMs);
	}

	// Invalidation lors d'une révocation : une session révoquée ne doit pas
	// rester servie depuis le cache jusqu'à la fin de son TTL.
	delete(key: string): void {
		this.entries.delete(key);
	}

	clear(): void {
		this.entries.clear();
	}

	getStale(key: string, secret: string): SessionCacheEntry<TSession, TUser> | null {
		const entry = this.read(key, secret, this.staleMaxAgeMs);
		return entry && entry.session.expires_at * 1000 > Date.now() ? entry : null;
	}

	private read(
		key: string,
		secret: string,
		maxAgeMs: number
	): SessionCacheEntry<TSession, TUser> | null {
		const entry = this.entries.get(key);
		if (!entry) {
			return null;
		}
		const age = Date.now() - entry.timestamp;
		if (age > this.staleMaxAgeMs) {
			this.entries.delete(key);
			return null;
		}
		if (!secretMatches(entry.secretHash, hashSecret(secret))) {
			return null;
		}
		if (age > maxAgeMs) {
			return null;
		}
		return entry;
	}
}
