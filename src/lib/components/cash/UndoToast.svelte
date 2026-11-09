<script lang="ts">
	// Toasts « Annuler » des actions mises en attente par une `UndoQueue`.
	// Une barre se vide pendant le délai : on voit combien de temps il reste pour
	// revenir sur son geste.
	import { Button } from '@davincibot/components';
	import type { UndoQueue } from '#lib/undoQueue.svelte.js';
	import { Undo2 } from '@lucide/svelte';

	let { queue }: { queue: UndoQueue } = $props();
</script>

{#if queue.pending.length > 0}
	<div
		class="fixed right-4 bottom-4 left-4 z-50 flex flex-col items-end gap-2 sm:left-auto"
		aria-live="polite"
		role="status"
	>
		{#each queue.pending as entry (entry.key)}
			<div
				class="border-rule bg-surface-modal relative w-full overflow-hidden rounded-xl border px-4 py-3 shadow-lg sm:w-96"
			>
				<div class="flex items-center justify-between gap-3">
					<p class="text-light-blue min-w-0 truncate text-sm">{entry.label}</p>
					<Button
						onclick={() => {
							queue.undo(entry.key);
						}}
						size="sm"
						variant="secondary"
					>
						<Undo2 class="size-4" />
						Annuler
					</Button>
				</div>
				<span
					style:animation-duration="{queue.delayMs}ms"
					class="undo-countdown bg-light-blue/60 absolute bottom-0 left-0 h-0.5 w-full origin-left"
				></span>
			</div>
		{/each}
	</div>
{/if}

<style>
	.undo-countdown {
		animation-name: undo-countdown;
		animation-timing-function: linear;
		animation-fill-mode: forwards;
	}

	@keyframes undo-countdown {
		from {
			transform: scaleX(1);
		}
		to {
			transform: scaleX(0);
		}
	}
</style>
