<script lang="ts">
	import { Button, OverlayBackdrop } from '@davincibot/components';

	interface Props {
		title: string;
		description?: string | null;
		initialName?: string;
		confirmLabel?: string;
		onSubmit: (name: string) => void;
		onCancel: () => void;
	}

	let {
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
	<div class="border-rule bg-surface-modal relative w-full max-w-md rounded-2xl border p-5 sm:p-6">
		<p class="text-dark-light-blue m-0 mb-3 text-[0.65rem] tracking-[0.32em] uppercase">
			{title}
		</p>
		{#if description}
			<p class="text-light-blue m-0 mb-3 text-sm">{description}</p>
		{/if}
		<form class="grid gap-4" onsubmit={handleSubmit}>
			<input
				id="passkey-name"
				class="border-rule-strong bg-dark-blue/60 text-light-blue placeholder:text-muted focus:border-light-blue/70 focus-visible:ring-light-blue/60 block w-full rounded-xl border p-2.5 text-sm focus:outline-none focus-visible:ring-2"
				aria-label="Nom de la passkey"
				autocomplete="off"
				maxlength="64"
				placeholder="Ex. MacBook du bureau"
				spellcheck="false"
				type="text"
				bind:value={name}
			/>
			<div class="flex items-center justify-end gap-2">
				<Button onclick={onCancel} size="sm" variant="ghost">Annuler</Button>
				<Button size="sm" type="submit" variant="secondary">
					{confirmLabel}
				</Button>
			</div>
		</form>
	</div>
</div>
