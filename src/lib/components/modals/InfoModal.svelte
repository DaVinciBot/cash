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
	class="fixed inset-0 z-50 flex items-center justify-center p-4"
	aria-modal="true"
	role="dialog"
	tabindex="-1"
>
	<OverlayBackdrop />
	<div class="relative flex max-h-full w-full max-w-md items-center justify-center">
		<!-- Modal content -->
		<div
			id="MultiPopup"
			class="border-light-blue/20 bg-surface-modal relative flex max-h-[min(85dvh,720px)] w-full flex-col overflow-y-auto rounded-2xl border p-4 text-center shadow-[0_26px_70px_rgba(2,6,30,0.6)] sm:p-6"
		>
			<button
				class="text-dark-light-blue hover:bg-blue-gray/25 absolute top-2.5 right-2.5 ml-auto inline-flex items-center rounded-lg bg-transparent p-1.5 text-sm hover:text-white"
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
				class="h-12 w-12 rounded-full {type === 'success' ? 'bg-emerald-500/15' : ''} {type ===
				'error'
					? 'bg-red-900'
					: ''} {type === 'warning' ? 'bg-yellow-900' : ''} {type === 'info'
					? 'bg-opacity-0'
					: ''} mx-auto mb-3.5 flex items-center justify-center p-2"
			>
				{#if type === 'success'}
					<svg
						class="size-8 text-emerald-400"
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
						class="text-dark-light-blue h-8 w-8"
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
							? 'bg-light-blue text-dark-blue hover:bg-white'
							: 'border border-white'} focus:ring-light-blue/60 focus:ring-4 focus:outline-none"
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
