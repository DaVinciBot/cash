<script lang="ts">
	import { OverlayBackdrop } from '@davincibot/components';
	import { CTAButton as CtaButton } from '@davincibot/components';

	interface Props {
		title: string;
		description?: string | null;
		initialName?: string;
		confirmLabel?: string;
		onSubmit: (name: string) => void;
		onCancel: () => void;
	}

	const {
		title,
		description = null,
		initialName = '',
		confirmLabel = 'Continuer',
		onSubmit,
		onCancel
	}: Props = $props();

	// Capture volontaire : la modale est recréée à chaque ouverture.
	// svelte-ignore state_referenced_locally
	let name = $state(initialName);

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) {
			return;
		}
		onSubmit(trimmed);
	}
</script>

<div
	id="passkey-name-modal"
	class="fixed inset-0 z-50 flex items-center justify-center p-4"
	aria-label={title}
	aria-modal="true"
	role="dialog"
>
	<OverlayBackdrop />
	<div
		class="border-light-blue/20 relative w-full max-w-md rounded-2xl border bg-[#060a2c] p-5 sm:p-6"
	>
		<p class="text-dark-light-blue m-0 mb-3 text-[0.65rem] tracking-[0.32em] uppercase">
			{title}
		</p>
		{#if description}
			<p class="text-light-blue m-0 mb-3 text-sm">{description}</p>
		{/if}
		<form class="grid gap-4" onsubmit={handleSubmit}>
			<input
				id="passkey-name"
				class="border-light-blue/30 bg-dark-blue/60 text-light-blue placeholder:text-dark-light-blue/50 focus:border-light-blue/70 block w-full rounded-xl border p-2.5 text-sm focus:outline-none"
				aria-label="Nom de la passkey"
				autocomplete="off"
				maxlength="64"
				placeholder="Ex. MacBook du bureau"
				spellcheck="false"
				type="text"
				bind:value={name}
			/>
			<div class="flex items-center justify-end gap-2">
				<button
					class="text-dark-light-blue cursor-pointer rounded-lg border-0 bg-transparent px-2 py-1 text-sm hover:underline"
					onclick={onCancel}
					type="button"
				>
					Annuler
				</button>
				<CtaButton fullWidth={false} size="sm" type="submit" variant="secondary">
					{confirmLabel}
				</CtaButton>
			</div>
		</form>
	</div>
</div>
