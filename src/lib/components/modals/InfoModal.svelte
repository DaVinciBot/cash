<script lang="ts">
	import { OverlayBackdrop } from '@davincibot/components';
	import { hideOnClickOutside } from '@davincibot/lib';
	import { onMount } from 'svelte';

	type InfoType = 'success' | 'error' | 'warning' | 'info';

	interface InfoAction {
		text: string;
		is_main?: boolean;
		callback?: (event: MouseEvent) => void;
	}

	interface Props {
		message?: string;
		type?: InfoType;
		onClose?: (event: Event | Element | null) => void;
		action?: InfoAction[];
	}

	const noopOnClose = () => {
		window.location.reload();
	};

	/* eslint-disable prefer-const */
	let {
		message = 'La commande a été passée avec succès.',
		type = 'success',
		onClose = noopOnClose,
		action = $bindable([
			{
				text: 'Suivant',
				is_main: true
			}
		])
	}: Props = $props();
	/* eslint-enable prefer-const */

	const popupSuffix = Math.random().toString(36).substring(7);
	const id = $derived(`${type}Popup-${popupSuffix}`);

	function close(e: Event | Element | null) {
		onClose(e);
	}

	function handleActionClick(el: InfoAction, e: MouseEvent) {
		el.callback?.(e);
		close(e);
	}

	onMount(() => {
		const popup = document.querySelector<HTMLElement>('#MultiPopup');
		if (popup) {
			hideOnClickOutside(popup, close);
		}
	});
</script>

<div
	{id}
	class="fixed top-0 right-0 left-0 z-50 h-full w-full items-center justify-center overflow-x-hidden overflow-y-auto md:inset-0"
	tabindex="-1"
>
	<OverlayBackdrop />
	<div class="relative m-auto flex h-full w-full max-w-md p-4">
		<!-- Modal content -->
		<div
			id="MultiPopup"
			class="relative m-auto rounded-lg bg-gray-800 p-4 text-center shadow sm:p-5"
		>
			<button
				class="absolute top-2.5 right-2.5 ml-auto inline-flex items-center rounded-lg bg-transparent p-1.5 text-sm text-gray-400 hover:bg-gray-600 hover:text-white"
				onclick={close}
				type="button"
			>
				<svg
					class="h-5 w-5"
					aria-hidden="true"
					fill="currentColor"
					viewBox="0 0 20 20"
					xmlns="http://www.w3.org/2000/svg"
					><path
						clip-rule="evenodd"
						d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
						fill-rule="evenodd"
					></path></svg
				>
				<span class="sr-only">Close modal</span>
			</button>
			<div
				class="h-12 w-12 rounded-full {type === 'success' ? 'bg-green-900' : ''} {type === 'error'
					? 'bg-red-900'
					: ''} {type === 'warning' ? 'bg-yellow-900' : ''} {type === 'info'
					? 'bg-opacity-0'
					: ''} mx-auto mb-3.5 flex items-center justify-center p-2"
			>
				{#if type === 'success'}
					<svg
						class="h-8text-green-400 w-8"
						aria-hidden="true"
						fill="currentColor"
						viewBox="0 0 20 20"
						xmlns="http://www.w3.org/2000/svg"
						><path
							clip-rule="evenodd"
							d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
							fill-rule="evenodd"
						></path></svg
					>
				{:else if type === 'error'}
					<svg
						class="h-8 w-8 text-red-400"
						fill="none"
						height="24"
						viewBox="0 0 24 24"
						width="24"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M12 13V8m0 8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
							stroke="currentColor"
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
						/>
					</svg>
				{:else if type === 'warning'}
					<svg
						class="h-8 w-8 text-yellow-400"
						fill="none"
						height="24"
						viewBox="0 0 24 24"
						width="24"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M12 13V8m0 8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
							stroke="currentColor"
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
						/>
					</svg>
				{:else if type === 'info'}
					<svg
						class="h-8 w-8 text-gray-400"
						fill="none"
						height="24"
						viewBox="0 0 24 24"
						width="24"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M12 13V8m0 8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
							stroke="currentColor"
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
						/>
					</svg>
				{/if}
				<span class="sr-only">Action modal</span>
			</div>
			<p class="mb-4 text-lg font-semibold text-white">{message}</p>
			<div class="flex flex-row justify-center space-x-2">
				{#each action as el (el.text)}
					<button
						class="rounded-lg px-3 py-2 text-center text-sm font-medium text-white {el.is_main
							? 'bg-primary-600 hover:bg-primary-700'
							: 'border border-white'} focus:ring-primary-900 focus:ring-4 focus:outline-none"
						onclick={(e: MouseEvent) => {
							handleActionClick(el, e);
						}}
						type="button"
					>
						{el.text}
					</button>
				{/each}
			</div>
		</div>
	</div>
</div>
