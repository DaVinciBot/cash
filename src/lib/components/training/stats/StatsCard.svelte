<script lang="ts">
	// Le cadre commun à tous les blocs de statistiques : même titre en capitales,
	// même façon d'annoncer ce qu'on lit, exactement comme les sections des
	// rapports de trésorerie. Répété sept fois à la main, il aurait divergé au
	// premier ajustement.
	//
	// Les tableaux portent déjà leur propre cadre ; un graphique, lui, a besoin
	// d'une boîte pour ne pas flotter sur le fond de page — d'où `boxed`.
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		hint?: string;
		/** Encadre le contenu, pour ce qui n'apporte pas sa propre bordure. */
		boxed?: boolean;
		children: Snippet;
	}

	let { title, hint = '', boxed = false, children }: Props = $props();
</script>

<section class="mb-8">
	<h2 class="mb-1 text-sm font-semibold tracking-wide text-gray-300 uppercase">{title}</h2>
	{#if hint}
		<p class="mb-3 text-xs text-gray-500">{hint}</p>
	{/if}
	{#if boxed}
		<div class="rounded-lg border border-gray-700 bg-gray-800 p-4">
			{@render children()}
		</div>
	{:else}
		{@render children()}
	{/if}
</section>
