<script lang="ts">
	import { resolve } from '$app/paths';
	import { DOCUMENT_KIND_LABELS, DOCUMENT_KINDS } from '@davincibot/lib';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Ce que chaque pièce fait, en une phrase : c'est ce qui permet de choisir
	// sans connaître le vocabulaire comptable.
	const PURPOSE: Record<string, string> = {
		expense_report: "Demander le remboursement d'une avance faite par un membre.",
		quote: 'Proposer un prix à un tiers, avant tout engagement.',
		invoice: 'Réclamer un paiement à un tiers pour une prestation rendue.',
		tax_receipt: 'Attester un don reçu, pour que le donateur le déduise de ses impôts.'
	};

	const ICON: Record<string, string> = {
		expense_report: '🧾',
		quote: '📄',
		invoice: '💶',
		tax_receipt: '🎁'
	};
</script>

<svelte:head><title>Nouveau document — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-3xl">
	<a class="text-sm text-gray-400 hover:text-gray-200" href={resolve('/treasury/documents' as '/')}
		>← Documents</a
	>

	<header class="mt-3 mb-6">
		<h1 class="text-2xl font-bold text-white">Quel document ?</h1>
		<p class="mt-1 text-sm text-gray-400">
			Le type commande la suite : les champs à remplir ne sont pas les mêmes.
		</p>
	</header>

	<ul class="grid gap-3 sm:grid-cols-2">
		{#each DOCUMENT_KINDS as kind (kind)}
			{@const missing = data.missingByKind[kind] ?? []}
			<li>
				<a
					class="hover:bg-gray-750 flex h-full flex-col rounded-lg border border-gray-700 bg-gray-800 p-4 transition hover:border-gray-500 aria-disabled:pointer-events-none aria-disabled:opacity-50"
					aria-disabled={missing.length > 0}
					href={resolve(`/treasury/documents/new/${kind}` as '/')}
				>
					<span class="text-2xl">{ICON[kind]}</span>
					<span class="mt-2 font-medium text-white">{DOCUMENT_KIND_LABELS[kind]}</span>
					<span class="mt-1 text-xs text-gray-400">{PURPOSE[kind]}</span>
					{#if missing.length > 0}
						<span class="mt-3 text-xs text-amber-300">
							Indisponible : il manque {missing.join(', ')} à l'identité de l'émetteur.
						</span>
					{/if}
				</a>
			</li>
		{/each}
	</ul>

	{#if DOCUMENT_KINDS.some((k) => (data.missingByKind[k] ?? []).length > 0)}
		<p
			class="mt-4 rounded-lg bg-amber-500/15 px-4 py-3 text-sm text-amber-200 ring-1 ring-amber-500/30"
		>
			Certaines pièces sont indisponibles tant que l'identité de l'émetteur est incomplète.
			<a class="underline" href={resolve('/treasury/documents/issuer' as '/')}>La compléter</a>
		</p>
	{/if}

	<p class="mt-6 text-xs text-gray-500">
		Un document émis fige son montant, son destinataire et l'identité de l'émetteur : il se rejoue à
		l'identique, indéfiniment. C'est aussi pourquoi il consomme un numéro de série, qui ne se
		réattribue pas.
	</p>
</section>
