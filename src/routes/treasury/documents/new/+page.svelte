<script lang="ts">
	import { resolve } from '$app/paths';
	import type { BadgeIcon } from '$lib/components/cash/stateIcons';
	import { DOCUMENT_KIND_LABELS, DOCUMENT_KINDS } from '@davincibot/lib';
	import { Euro, FileText, Gift, Receipt } from '@lucide/svelte';
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

	const ICON: Record<string, BadgeIcon> = {
		expense_report: Receipt,
		quote: FileText,
		invoice: Euro,
		tax_receipt: Gift
	};
</script>

<svelte:head><title>Nouveau document — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-3xl">
	<a
		class="text-dark-light-blue hover:text-light-blue text-sm"
		href={resolve('/treasury/documents')}>← Documents</a
	>

	<header class="mt-3 mb-6">
		<h1 class="text-2xl font-bold text-white">Quel document ?</h1>
		<p class="text-dark-light-blue mt-1 text-sm">
			Le type commande la suite : les champs à remplir ne sont pas les mêmes.
		</p>
	</header>

	<ul class="grid gap-3 sm:grid-cols-2">
		{#each DOCUMENT_KINDS as kind (kind)}
			{@const missing = data.missingByKind[kind] ?? []}
			{@const KindIcon = ICON[kind]}
			<li>
				<a
					class="hover:bg-blue-gray/15 border-rule bg-blue-gray/15 hover:border-light-blue/60 flex h-full flex-col rounded-lg border p-4 transition aria-disabled:pointer-events-none aria-disabled:opacity-50"
					aria-disabled={missing.length > 0}
					href={resolve('/treasury/documents/new/[kind]', { kind })}
				>
					<KindIcon class="text-dark-light-blue size-6 shrink-0" />
					<span class="text-light-blue mt-2 font-medium">{DOCUMENT_KIND_LABELS[kind]}</span>
					<span class="text-dark-light-blue mt-1 text-xs">{PURPOSE[kind]}</span>
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
			class="mt-4 rounded-xl bg-amber-500/15 px-4 py-3 text-sm text-amber-300 ring-1 ring-amber-500/30"
		>
			Certaines pièces sont indisponibles tant que l'identité de l'émetteur est incomplète.
			<a class="underline" href={resolve('/treasury/documents/issuer')}>La compléter</a>
		</p>
	{/if}

	<p class="text-dark-light-blue/70 mt-6 text-xs">
		Un document émis fige son montant, son destinataire et l'identité de l'émetteur : il se rejoue à
		l'identique, indéfiniment. C'est aussi pourquoi il consomme un numéro de série, qui ne se
		réattribue pas.
	</p>
</section>
