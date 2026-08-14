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
	<a class="text-sm text-gray-400 hover:text-gray-200" href={resolve('/treasury')}>← Trésorerie</a>

	<header class="mt-3 mb-6 flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-white">Documents</h1>
			<p class="mt-1 text-sm text-gray-400">
				Notes de frais, devis, factures et reçus fiscaux. Un document émis fige son montant, son
				destinataire et l'identité de l'émetteur : il se rejoue à l'identique, indéfiniment.
			</p>
		</div>
		<div class="flex gap-2">
			<a
				class="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
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
		<p class="rounded-lg border border-dashed border-gray-600 px-4 py-12 text-center text-gray-400">
			Aucun document émis.
		</p>
	{:else}
		<ul class="space-y-2">
			{#each data.documents as doc (doc.id)}
				<li
					class="flex flex-wrap items-center gap-3 rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm"
				>
					<span class="font-mono text-xs text-gray-400">{doc.number}</span>
					<span class="font-medium text-white">{DOCUMENT_KIND_LABELS[doc.kind]}</span>
					<span class="text-gray-300">{doc.recipientName}</span>
					{#if doc.subject}<span class="truncate text-xs text-gray-500">{doc.subject}</span>{/if}
					<span class="ml-auto font-medium text-gray-100">{euro.format(doc.amountTtc)}</span>
					<span class="text-xs text-gray-500">{day.format(new Date(doc.issuedOn))}</span>
					<a
						class="rounded-lg border border-gray-600 px-3 py-1 text-xs text-gray-200 hover:bg-gray-700"
						href={resolve('/treasury/documents/[id]', { id: String(doc.id) })}
						>Ouvrir
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>
