import { beforeEach, describe, expect, it, vi } from 'vitest';

import { flushSync, mount, unmount } from 'svelte';

vi.mock('$env/dynamic/public', () => ({ env: {} }));
vi.mock('@davincibot/lib/supabase', () => ({
	getSupabaseBrowserClient: () => ({})
}));

const mocks = vi.hoisted(() => ({
	submitReport: vi.fn()
}));

vi.mock('$lib/settings', async (importOriginal) => {
	const actual = await importOriginal<typeof reportModule>();
	return { ...actual, submitReport: mocks.submitReport };
});

import ReportPanel from '$lib/components/settings/ReportPanel.svelte';
import type * as reportModule from '$lib/settings';
import type { UserProfile } from '@davincibot/lib';
import { userdata } from '@davincibot/lib';

const profile: UserProfile = {
	email: 'alice@example.com',
	name: 'Alice',
	avatar: 'https://example.com/avatar.png',
	id: 'user-1',
	campus: null,
	projects: [],
	permissions: [],
	allProjects: null
};

function mountPanel() {
	const target = document.createElement('div');
	document.body.appendChild(target);
	const instance = mount(ReportPanel, { target });
	flushSync();
	const cleanup = () => {
		void unmount(instance);
		target.remove();
	};
	return { target, cleanup };
}

const setInputValue = (target: HTMLElement, selector: string, value: string) => {
	const input = target.querySelector<HTMLInputElement>(selector);
	expect(input).not.toBeNull();
	if (input) {
		input.value = value;
		input.dispatchEvent(new Event('input', { bubbles: true }));
	}
	flushSync();
};

const submitForm = (target: HTMLElement) => {
	target
		.querySelector('form')
		?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
	flushSync();
};

describe('ReportPanel — signalement anonyme', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		userdata.set({ ...profile });
	});

	it('affiche la case anonyme, décochée par défaut', () => {
		const { target, cleanup } = mountPanel();

		const checkbox = target.querySelector<HTMLInputElement>('#report-anonymous');
		expect(checkbox).not.toBeNull();
		expect(checkbox?.checked).toBe(false);

		cleanup();
	});

	it('envoie anonymous: false par défaut', async () => {
		mocks.submitReport.mockResolvedValue(undefined);
		const { target, cleanup } = mountPanel();

		setInputValue(target, '#report-title', 'Titre');
		setInputValue(target, '#report-description', 'Description');
		submitForm(target);

		await vi.waitFor(() => {
			expect(mocks.submitReport).toHaveBeenCalledTimes(1);
		});
		expect(mocks.submitReport).toHaveBeenCalledWith(
			'user-1',
			expect.objectContaining({ anonymous: false })
		);

		cleanup();
	});

	it('envoie anonymous: true quand la case est cochée, puis la décoche après succès', async () => {
		mocks.submitReport.mockResolvedValue(undefined);
		const { target, cleanup } = mountPanel();

		const checkbox = target.querySelector<HTMLInputElement>('#report-anonymous');
		checkbox?.click();
		flushSync();
		expect(checkbox?.checked).toBe(true);

		setInputValue(target, '#report-title', 'Titre');
		setInputValue(target, '#report-description', 'Description');
		submitForm(target);

		await vi.waitFor(() => {
			expect(mocks.submitReport).toHaveBeenCalledWith(
				'user-1',
				expect.objectContaining({ anonymous: true })
			);
		});
		await vi.waitFor(() => {
			flushSync();
			expect(checkbox?.checked).toBe(false);
		});

		cleanup();
	});
});
