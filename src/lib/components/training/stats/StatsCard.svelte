<script lang="ts">
	// Le cadre commun à tous les blocs de statistiques : même bordure, même
	// fond, même façon d'annoncer ce qu'on lit. Répété sept fois à la main, il
	// aurait divergé au premier ajustement.
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		hint?: string;
		children: Snippet;
	}

	let { title, hint = '', children }: Props = $props();
</script>

<section class="border-light-blue/10 bg-dark-blue/70 rounded-[22px] border p-4 sm:p-5">
	<header class="mb-4">
		<h2 class="text-base font-semibold text-white">{title}</h2>
		{#if hint}
			<p class="text-light-blue/60 text-xs">{hint}</p>
		{/if}
	</header>
	{@render children()}
</section>
