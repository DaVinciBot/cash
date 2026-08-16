<script lang="ts">
	// Cadres de signature, communs aux quatre pièces.

	interface Slot {
		/** Qui signe : « Trésorier », « Le client »… */
		role: string;
		/** Nom du signataire quand il est connu à l'émission. */
		name?: string | null;
	}

	interface Props {
		title?: string;
		/** Ce que le signataire doit écrire de sa main avant de signer. */
		hint?: string;
		slots: Slot[];
	}

	let { title = 'Signatures', hint, slots }: Props = $props();

	// Trois cadres se partagent la largeur, deux aussi ; un seul reste étroit et
	// calé à droite plutôt que de s'étirer sur toute la feuille.
	const columns = $derived(
		slots.length >= 3 ? 'grid-cols-3' : slots.length === 2 ? 'grid-cols-2' : 'grid-cols-1'
	);
	const width = $derived(slots.length === 1 ? 'ml-auto max-w-[9cm]' : '');
</script>

<section class="avoid-break mt-10 text-sm">
	<p class="text-dvb font-bold">{title}</p>
	{#if hint}
		<p class="text-xs text-gray-600">{hint}</p>
	{/if}

	<div class="mt-4 grid {columns} {width} gap-8">
		{#each slots as slot (slot.role)}
			<div>
				<p class="font-medium">{slot.role}</p>
				{#if slot.name}
					<p class="text-xs text-gray-600">{slot.name}</p>
				{/if}
				<!-- L'espace à remplir : assez haut pour une mention manuscrite ET une
				     signature en dessous. -->
				<div class="mt-20 border-t border-black"></div>
				<p class="mt-1 text-xs text-gray-500">Date et signature</p>
			</div>
		{/each}
	</div>
</section>
