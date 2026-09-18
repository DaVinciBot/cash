<script lang="ts">
	import { resolve } from '$app/paths';
	import { DOCUMENT_KIND_LABELS } from '@davincibot/lib';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
</script>

<svelte:head><title>Documents — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-5xl">
	<a class="text-dark-light-blue hover:text-light-blue text-sm" href={resolve('/treasury')}
		>← Trésorerie</a
	>

	<header class="mt-3 mb-6 flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-white">Documents</h1>
			<p class="text-dark-light-blue mt-1 text-sm">
				Notes de frais, devis, factures et reçus fiscaux. Un document émis fige son montant, son
				destinataire et l'identité de l'émetteur : il se rejoue à l'identique, indéfiniment.
			</p>
		</div>
		<div class="flex gap-2">
			<a
				class="border-light-blue/30 text-light-blue hover:bg-blue-gray/15 rounded-lg border px-4 py-2 text-sm"
				href={resolve('/treasury/documents/issuer')}>Identité de l'émetteur</a
			>
			<a
				class="bg-primary-600 hover:bg-primary-800 rounded-lg px-4 py-2 text-sm font-medium text-white"
				href={resolve('/treasury/documents/new')}>Nouveau document</a
			>
		</div>
	</header>

	{#if !data.issuerReady}
		<p
			class="mb-4 rounded-lg bg-amber-500/15 px-4 py-3 text-sm text-amber-200 ring-1 ring-amber-500/30"
		>
			L'identité de l'émetteur est incomplète : certaines pièces ne peuvent pas être émises.
			<a class="underline" href={resolve('/treasury/documents/issuer')}>La compléter</a>
		</p>
	{/if}

	{#if data.documents.length === 0}
		<p
			class="border-light-blue/20 text-dark-light-blue/70 rounded-xl border border-dashed px-4 py-12 text-center"
		>
			Aucun document émis.
		</p>
	{:else}
		<ul class="space-y-2">
			{#each data.documents as doc (doc.id)}
				<li
					class="border-light-blue/20 bg-blue-gray/15 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-sm"
				>
					<span class="text-dark-light-blue font-mono text-xs">{doc.number}</span>
					<span class="font-medium text-white">{DOCUMENT_KIND_LABELS[doc.kind]}</span>
					<span class="text-dark-light-blue">{doc.recipientName}</span>
					{#if doc.subject}<span class="text-dark-light-blue/70 truncate text-xs"
							>{doc.subject}</span
						>{/if}
					<span class="text-light-blue ml-auto font-medium">{euro.format(doc.amountTtc)}</span>
					<span class="text-dark-light-blue/70 text-xs">{day.format(new Date(doc.issuedOn))}</span>
					<a
						class="border-light-blue/30 text-light-blue hover:bg-blue-gray/15 rounded-lg border px-3 py-1 text-xs"
						href={resolve('/treasury/documents/[id]', { id: String(doc.id) })}
						>Ouvrir
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>
