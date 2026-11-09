<script lang="ts">
	// Confirmation d'une action IRRÉVERSIBLE (suppression définitive, passage à un
	// état sans retour). Le dialogue porte son propre formulaire : l'action ne part
	// qu'au clic sur « Confirmer », et le déclencheur peut disparaître entre-temps
	// (menu de ligne refermé) sans emporter la soumission avec lui.
	//
	// Pour une action qu'on peut rattraper, préférer le toast d'annulation
	// (`UndoToast`) : il ne coupe pas le geste, et laisse quelques secondes pour
	// revenir en arrière.
	import { Button, Modal } from '@davincibot/components';
	import { enhance, type SubmitFunction } from '$app/forms';
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		/** Action SvelteKit visée, par exemple `?/remove`. */
		action: string;
		/** Champs cachés envoyés avec l'action. */
		fields: Record<string, string | number>;
		confirmLabel?: string;
		tone?: 'danger' | 'primary';
		/** Appelé à la fermeture, qu'on ait confirmé ou renoncé. */
		onClose: () => void;
		/** Traitement du résultat, par défaut la mise à jour standard de la page. */
		submit?: SubmitFunction;
		children: Snippet;
	}

	let {
		title,
		action,
		fields,
		confirmLabel = 'Confirmer',
		tone = 'danger',
		onClose,
		submit,
		children
	}: Props = $props();

	let sending = $state(false);

	const id = $props.id();

	const handle: SubmitFunction = async (input) => {
		sending = true;
		const after = await submit?.(input);
		return async (options) => {
			try {
				if (typeof after === 'function') {
					await after(options);
				} else {
					await options.update();
				}
			} finally {
				sending = false;
				onClose();
			}
		};
	};
</script>

<Modal {id} {onClose} {title}>
	<form {action} method="POST" use:enhance={handle}>
		{#each Object.entries(fields) as [name, value] (name)}
			<input {name} type="hidden" {value} />
		{/each}
		<div class="text-light-blue text-sm">
			{@render children()}
		</div>
		<div class="mt-6 flex justify-end gap-2">
			<Button disabled={sending} onclick={onClose} size="md" variant="secondary">Annuler</Button>
			<Button disabled={sending} size="md" type="submit" variant={tone}>{confirmLabel}</Button>
		</div>
	</form>
</Modal>
