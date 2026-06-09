import { describe, expect, it, vi } from 'vitest';

import { mount } from 'svelte';
import UserImportModal from '../../src/lib/components/modals/UserImportModal.svelte';

describe('UserImportModal (components submodule)', () => {
	it('submits a valid simple user payload', async () => {
		const onSubmit = vi.fn(() => Promise.resolve());
		const onClose = vi.fn();
		const target = document.createElement('div');
		document.body.appendChild(target);

		mount(UserImportModal, {
			target,
			props: {
				permissionCategories: {},
				permissionPackages: [],
				projectOptions: [{ value: 'project-1', name: 'Project 1' }],
				onSubmit,
				onClose
			}
		});

		const nameInput = target.querySelector<HTMLInputElement>('#simple-name');
		const emailInput = target.querySelector<HTMLInputElement>('#simple-email');
		const projectSelect = target.querySelector<HTMLSelectElement>('#simple-project');
		const form = target.querySelector<HTMLFormElement>('form');

		if (!nameInput || !emailInput || !projectSelect || !form) {
			throw new Error('Expected simple import form controls to be mounted.');
		}

		nameInput.value = 'Alice';
		nameInput.dispatchEvent(new Event('input', { bubbles: true }));
		emailInput.value = 'alice@example.com';
		emailInput.dispatchEvent(new Event('input', { bubbles: true }));
		projectSelect.value = 'project-1';
		projectSelect.dispatchEvent(new Event('change', { bubbles: true }));

		form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
		await new Promise<void>((resolve) => setTimeout(resolve, 0));

		expect(onSubmit).toHaveBeenCalledWith({
			permissions: [],
			project: '',
			users: [{ name: 'Alice', email: 'alice@example.com', project: 'project-1' }]
		});
		expect(onClose).toHaveBeenCalledTimes(1);

		target.remove();
	});
});
