<script lang="ts">
	import { Button } from '@davincibot/components';
	import { Ellipsis } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	// Menu d'actions d'une ligne de table. Le panneau est en `fixed`, calé sur le
	// bouton : le conteneur défilant de la table le rognerait sinon. Il s'ouvre
	// en haut à gauche du bouton, son bord droit sur celui du bouton ; faute de
	// place, il se rabat sous le bouton et contre le bord de l'écran.
	const GAP = 2;
	const MARGIN = 8;

	let { label = 'Actions', children }: { label?: string; children: Snippet<[close: () => void]> } =
		$props();

	let open = $state(false);
	let trigger = $state<HTMLElement | null>(null);
	let panel = $state<HTMLDivElement | null>(null);
	let anchor = $state<DOMRect | null>(null);
	let position = $state<{ top: number; left: number } | null>(null);

	function close() {
		open = false;
	}

	function toggle() {
		anchor = open || !trigger ? null : trigger.getBoundingClientRect();
		position = null;
		open = !open;
	}

	// Posé une fois le panneau monté, pour connaître sa taille ; invisible d'ici là.
	$effect(() => {
		if (!panel || !anchor) {
			return;
		}
		const { offsetWidth, offsetHeight } = panel;
		const above = anchor.top - offsetHeight - GAP;
		position = {
			top: above >= MARGIN ? above : anchor.bottom + GAP,
			left: Math.max(
				MARGIN,
				Math.min(anchor.right - offsetWidth, window.innerWidth - offsetWidth - MARGIN)
			)
		};
	});

	$effect(() => {
		if (!open) {
			return;
		}
		const onPointerDown = (event: PointerEvent) => {
			const target = event.target as Node;
			if (!panel?.contains(target) && !trigger?.contains(target)) {
				close();
			}
		};
		const onKeydown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				close();
				trigger?.focus();
			}
		};
		document.addEventListener('pointerdown', onPointerDown);
		document.addEventListener('keydown', onKeydown);
		window.addEventListener('resize', close);
		window.addEventListener('scroll', close, true);
		return () => {
			document.removeEventListener('pointerdown', onPointerDown);
			document.removeEventListener('keydown', onKeydown);
			window.removeEventListener('resize', close);
			window.removeEventListener('scroll', close, true);
		};
	});
</script>

<div class="flex w-full justify-end">
	<Button
		aria-expanded={open}
		aria-haspopup="menu"
		aria-label={label}
		onclick={toggle}
		size="icon"
		title={label}
		variant="ghost"
		bind:ref={trigger}
	>
		<Ellipsis class="size-5" aria-hidden="true" />
	</Button>
</div>

{#if open}
	<div
		bind:this={panel}
		style:top="{position?.top ?? 0}px"
		style:left="{position?.left ?? 0}px"
		style:visibility={position ? 'visible' : 'hidden'}
		class="border-rule bg-surface-modal fixed z-40 flex min-w-44 flex-col gap-2 rounded-lg border p-2 shadow-2xl"
		role="menu"
	>
		{@render children(close)}
	</div>
{/if}
