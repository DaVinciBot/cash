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
		class="pointer-events-none fixed inset-x-4 bottom-6 z-50 flex flex-col items-center gap-2"
		aria-live="polite"
		role="status"
	>
		{#each queue.pending as entry (entry.key)}
			<div
				class="bg-main-blue shadow-main-blue/40 pointer-events-auto relative w-full max-w-md overflow-hidden rounded-xl px-4 py-3 shadow-xl ring-1 ring-white/15"
			>
				<div class="flex items-center justify-between gap-3">
					<p class="min-w-0 truncate text-sm font-medium text-white">{entry.label}</p>
					<Button
						onclick={() => {
							queue.undo(entry.key);
						}}
						size="sm"
						variant="primary"
					>
						<Undo2 class="size-4" />
						Annuler
					</Button>
				</div>
				<span
					style:animation-duration="{queue.delayMs}ms"
					class="undo-countdown absolute bottom-0 left-0 h-0.5 w-full origin-left bg-white/70"
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
