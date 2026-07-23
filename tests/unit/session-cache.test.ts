import { afterEach, describe, expect, it, vi } from 'vitest';
// Test unitaire Node : le subpath server-only n'atteint aucun bundle client.
import { SessionCache } from '@davincibot/lib/server';

const TTL = 5 * 60 * 1000;
const STALE_MAX = 15 * 60 * 1000;

interface TestSession {
	expires_at: number;
	label: string;
}

const futureSession = (label = 'session'): TestSession => ({
	expires_at: Math.floor(Date.now() / 1000) + 3600,
	label
});

afterEach(() => {
	vi.useRealTimers();
});

describe('SessionCache', () => {
	it('sert une entrée fraîche avec le bon secret uniquement', () => {
		const cache = new SessionCache<TestSession, string>(TTL, STALE_MAX);
		cache.set('sid', futureSession(), 'user', 'secret');
		expect(cache.getFresh('sid', 'secret')?.user).toBe('user');
		expect(cache.getFresh('sid', 'autre-secret')).toBeNull();
	});

	it('ne sert plus en frais après le TTL mais reste disponible en périmé', () => {
		vi.useFakeTimers();
		const cache = new SessionCache<TestSession, string>(TTL, STALE_MAX);
		cache.set('sid', futureSession(), 'user', 'secret');
		vi.advanceTimersByTime(TTL + 1000);
		expect(cache.getFresh('sid', 'secret')).toBeNull();
		expect(cache.getStale('sid', 'secret')?.user).toBe('user');
	});

	it('ne sert jamais en périmé un access token expiré', () => {
		vi.useFakeTimers();
		const cache = new SessionCache<TestSession, string>(TTL, STALE_MAX);
		cache.set(
			'sid',
			{ expires_at: Math.floor(Date.now() / 1000) + 60, label: 'court' },
			'user',
			'secret'
		);
		vi.advanceTimersByTime(TTL + 1000);
		expect(cache.getStale('sid', 'secret')).toBeNull();
	});

	it('purge après l’âge maximal', () => {
		vi.useFakeTimers();
		const cache = new SessionCache<TestSession, string>(TTL, STALE_MAX);
		cache.set('sid', futureSession(), 'user', 'secret');
		vi.advanceTimersByTime(STALE_MAX + 1000);
		expect(cache.getStale('sid', 'secret')).toBeNull();
		expect(cache.getFresh('sid', 'secret')).toBeNull();
	});

	it('exige le bon secret même en périmé', () => {
		vi.useFakeTimers();
		const cache = new SessionCache<TestSession, string>(TTL, STALE_MAX);
		cache.set('sid', futureSession(), 'user', 'secret');
		vi.advanceTimersByTime(TTL + 1000);
		expect(cache.getStale('sid', 'mauvais')).toBeNull();
	});

	it('delete ne purge que la clé visée', () => {
		const cache = new SessionCache<TestSession, string>(TTL, STALE_MAX);
		cache.set('sid-a', futureSession(), 'user-a', 'secret-a');
		cache.set('sid-b', futureSession(), 'user-b', 'secret-b');
		cache.delete('sid-a');
		expect(cache.getFresh('sid-a', 'secret-a')).toBeNull();
		expect(cache.getFresh('sid-b', 'secret-b')?.user).toBe('user-b');
	});

	it('clear purge toutes les entrées', () => {
		const cache = new SessionCache<TestSession, string>(TTL, STALE_MAX);
		cache.set('sid-a', futureSession(), 'user-a', 'secret-a');
		cache.set('sid-b', futureSession(), 'user-b', 'secret-b');
		cache.clear();
		expect(cache.getFresh('sid-a', 'secret-a')).toBeNull();
		expect(cache.getFresh('sid-b', 'secret-b')).toBeNull();
	});

	it('vérifie toujours le secret après une réinsertion post-delete', () => {
		const cache = new SessionCache<TestSession, string>(TTL, STALE_MAX);
		cache.set('sid', futureSession(), 'user', 'secret');
		cache.delete('sid');
		cache.set('sid', futureSession(), 'user', 'nouveau-secret');
		expect(cache.getFresh('sid', 'secret')).toBeNull();
		expect(cache.getFresh('sid', 'nouveau-secret')?.user).toBe('user');
	});
});
