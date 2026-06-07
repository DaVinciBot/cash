import { describe, expect, it, vi } from 'vitest';

import UserImportModal from '../../src/lib/components/modals/UserImportModal.svelte';
import { mount } from 'svelte';

describe('UserImportModal (components submodule)', () => {
	it('submits a valid simple user payload', async () => {
		const onSubmit = vi.fn(async () => {});
		const onClose = vi.fn();
		const target = document.createElement('div');
		document.body.appendChild(target);

		mount(UserImportModal, {
			target,
			props: {
				permissionCategories: {},
				permissionPackages: [],
				projectOptions: [{ value: 'project-1', text: 'Project 1' }],
				onSubmit,
				onClose
			}
		});

		const nameInput = target.querySelector('#simple-name');
		const emailInput = target.querySelector('#simple-email');
		const projectSelect = target.querySelector('#simple-project');
		const form = target.querySelector('form');

		nameInput.value = 'Alice';
		nameInput.dispatchEvent(new Event('input', { bubbles: true }));
		emailInput.value = 'alice@example.com';
		emailInput.dispatchEvent(new Event('input', { bubbles: true }));
		projectSelect.value = 'project-1';
		projectSelect.dispatchEvent(new Event('change', { bubbles: true }));

		form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
		await Promise.resolve();

		expect(onSubmit).toHaveBeenCalledWith({
			permissions: [],
			project: '',
			users: [{ name: 'Alice', email: 'alice@example.com', project: 'project-1' }]
		});
		expect(onClose).toHaveBeenCalledTimes(1);

		target.remove();
	});
});
