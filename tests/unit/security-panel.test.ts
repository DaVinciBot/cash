import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { flushSync, mount, unmount } from 'svelte';

vi.mock('$env/dynamic/public', () => ({ env: {} }));
vi.mock('@davincibot/lib/supabase', () => ({
	getSupabaseBrowserClient: () => ({})
}));

const mocks = vi.hoisted(() => ({
	fetchSessions: vi.fn(),
	revokeSession: vi.fn(),
	revokeAllSessions: vi.fn(),
	fetchConnections: vi.fn(),
	revokeConnection: vi.fn()
}));

const mfaMocks = vi.hoisted(() => ({
	fetchMfaState: vi.fn(),
	startEmailEnrollment: vi.fn(),
	verifyEmailEnrollment: vi.fn(),
	startTotpEnrollment: vi.fn(),
	verifyTotpEnrollment: vi.fn(),
	disableMfaMethod: vi.fn(),
	regenerateRecoveryCodes: vi.fn(),
	stepUpChallenge: vi.fn(),
	stepUpVerify: vi.fn()
}));

// sessions et mfa sont réexportés par le même barrel @davincibot/lib/settings :
// un seul vi.mock, sinon le second écraserait le premier.
vi.mock('@davincibot/lib/settings', () => ({ ...mocks, ...mfaMocks }));

import SecurityPanel from '../../src/lib/components/settings/SecurityPanel.svelte';

// La session courante est volontairement en dernier : le composant doit la remonter en tête.
const sessions = [
	{
		id: 'sess-other',
		created_at: '2026-07-15T10:00:00Z',
		last_seen_at: null,
		absolute_expires_at: null,
		trusted_device: false,
		device_label:
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
		is_current: false
	},
	{
		id: 'sess-current',
		created_at: '2026-07-16T08:00:00Z',
		last_seen_at: '2026-07-16T09:00:00Z',
		absolute_expires_at: null,
		trusted_device: true,
		device_label:
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
		is_current: true
	}
];

const connections = [
	{
		client_id: 'rallly',
		name: 'Rallly',
		scopes: 'openid profile email',
		active: true,
		latest_expires_at: '2026-07-16T12:00:00Z'
	}
];

let cleanup: (() => void) | null = null;

function mountPanel() {
	const target = document.createElement('div');
	document.body.appendChild(target);
	const instance = mount(SecurityPanel, { target });
	flushSync();
	cleanup = () => {
		void unmount(instance);
		target.remove();
	};
	return target;
}

const waitForSelector = async (target: HTMLElement, selector: string) => {
	await vi.waitFor(() => {
		flushSync();
		expect(target.querySelector(selector)).not.toBeNull();
	});
};

beforeEach(() => {
	vi.clearAllMocks();
	mocks.fetchSessions.mockResolvedValue(sessions);
	mocks.fetchConnections.mockResolvedValue(connections);
	mocks.revokeSession.mockResolvedValue(undefined);
	mocks.revokeAllSessions.mockResolvedValue(undefined);
	mocks.revokeConnection.mockResolvedValue(undefined);
	mfaMocks.fetchMfaState.mockResolvedValue({
		methods: [],
		recovery_codes_remaining: 0,
		has_mfa: false,
		elevated: false
	});
	vi.spyOn(window, 'confirm').mockReturnValue(true);
	vi.spyOn(window, 'alert').mockImplementation(() => undefined);
});

afterEach(() => {
	cleanup?.();
	cleanup = null;
	vi.restoreAllMocks();
});

describe('SecurityPanel — appareils connectés', () => {
	it('liste les appareils, marque « Cet appareil » et parse le user-agent', async () => {
		const target = mountPanel();
		await waitForSelector(target, '#session-sess-current');

		expect(target.querySelector('#session-sess-current')?.textContent).toContain('Cet appareil');
		expect(target.querySelector('#sessions-section li')?.id).toBe('session-sess-current');
		expect(target.querySelector('#session-sess-current')?.textContent).not.toContain(
			'Chrome · macOS'
		);
		expect(
			target.querySelector('#session-sess-current [aria-label="Appareil de confiance"]')
		).not.toBeNull();
		expect(target.querySelector('#session-sess-current')?.textContent).not.toContain(
			'Dernière activité'
		);
		expect(target.querySelector('#session-sess-other')?.textContent).toContain('Firefox · Windows');
		expect(target.querySelector('#session-revoke-sess-current')).toBeNull();
		expect(target.querySelector('#session-revoke-sess-other')).not.toBeNull();
	});

	it('demande confirmation, révoque l’appareil visé puis recharge', async () => {
		const target = mountPanel();
		await waitForSelector(target, '#session-revoke-sess-other');

		target.querySelector<HTMLButtonElement>('#session-revoke-sess-other')?.click();
		flushSync();

		await vi.waitFor(() => {
			expect(mocks.revokeSession).toHaveBeenCalledWith('sess-other');
			expect(mocks.fetchSessions).toHaveBeenCalledTimes(2);
		});
	});

	it('ne révoque rien quand la confirmation est refusée', async () => {
		vi.spyOn(window, 'confirm').mockReturnValue(false);
		const target = mountPanel();
		await waitForSelector(target, '#session-revoke-sess-other');

		target.querySelector<HTMLButtonElement>('#session-revoke-sess-other')?.click();
		flushSync();

		expect(mocks.revokeSession).not.toHaveBeenCalled();
	});

	it('déconnecte tous les autres appareils', async () => {
		const target = mountPanel();
		await waitForSelector(target, '#sessions-revoke-all');

		target.querySelector<HTMLButtonElement>('#sessions-revoke-all')?.click();
		flushSync();

		await vi.waitFor(() => {
			expect(mocks.revokeAllSessions).toHaveBeenCalledTimes(1);
		});
	});

	it('affiche l’erreur de chargement et permet de réessayer', async () => {
		mocks.fetchSessions.mockRejectedValueOnce(new Error('Service indisponible'));
		const target = mountPanel();

		await vi.waitFor(() => {
			flushSync();
			expect(target.querySelector('#sessions-section')?.textContent).toContain(
				'Service indisponible'
			);
		});

		const retry = Array.from(
			target.querySelectorAll<HTMLButtonElement>('#sessions-section button')
		).find((button) => button.textContent.includes('Réessayer'));
		retry?.click();
		flushSync();

		await waitForSelector(target, '#session-sess-current');
	});
});

describe('SecurityPanel — applications connectées', () => {
	it('liste les applications avec leur nom et la date, sans badge ni scopes', async () => {
		const target = mountPanel();
		await waitForSelector(target, '#connection-rallly');

		const row = target.querySelector('#connection-rallly');
		expect(row?.textContent).toContain('Rallly');
		expect(row?.textContent).toContain('juil');
		expect(row?.textContent).not.toContain('Active');
		expect(row?.textContent).not.toContain('openid profile email');
	});

	it('révoque une application après confirmation', async () => {
		const target = mountPanel();
		await waitForSelector(target, '#connection-revoke-rallly');

		target.querySelector<HTMLButtonElement>('#connection-revoke-rallly')?.click();
		flushSync();

		await vi.waitFor(() => {
			expect(mocks.revokeConnection).toHaveBeenCalledWith('rallly');
			expect(mocks.fetchConnections).toHaveBeenCalledTimes(2);
		});
	});

	it('affiche l’état vide sans application', async () => {
		mocks.fetchConnections.mockResolvedValue([]);
		const target = mountPanel();

		await vi.waitFor(() => {
			flushSync();
			expect(target.querySelector('#connections-section')?.textContent).toContain(
				'Aucune application connectée'
			);
		});
	});
});

describe('SecurityPanel — vérification en deux étapes', () => {
	it('rend la section MFA entre le mot de passe et les appareils', async () => {
		const target = mountPanel();
		await waitForSelector(target, '#mfa-section');

		const ids = Array.from(target.querySelectorAll('section')).map((section) => section.id);
		expect(ids.indexOf('mfa-section')).toBeLessThan(ids.indexOf('sessions-section'));
	});
});
