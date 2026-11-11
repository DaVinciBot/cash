<script lang="ts">
	import { Button } from '@davincibot/components';
	import { resolve } from '$app/paths';
	import CampusBadge from '#lib/components/cash/CampusBadge.svelte';
	import HistoryTimeline from '#lib/components/cash/HistoryTimeline.svelte';
	import ItemStateBadge from '#lib/components/cash/ItemStateBadge.svelte';
	import { isItemEditableByMember, isItemRefused } from '#lib/types/domain.js';
	import { ExternalLink } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const item = $derived(data.item);

	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
</script>

<svelte:head><title>{item.name} — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-3xl">
	<a class="text-dark-light-blue hover:text-light-blue text-sm" href={resolve('/')}>← Mes items</a>

	<header class="mt-3 mb-6 flex flex-wrap items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-white">{item.name}</h1>
			<div class="mt-2 flex flex-wrap items-center gap-2">
				<ItemStateBadge state={item.state} />
				<CampusBadge campus={item.campus} />
				<span class="text-dark-light-blue text-sm">{item.projectName}</span>
			</div>
		</div>
		{#if item.isMine && isItemEditableByMember(item.state)}
			<Button
				href={resolve('/items/[id]/edit', { id: String(item.id) })}
				size="md"
				variant="secondary">Modifier</Button
			>
		{/if}
	</header>

	{#if isItemRefused(item.state) && item.refusedReason}
		<!-- CMD-F-29 — le motif est la seule chose que le membre lit pour
		     comprendre la décision : il passe avant le reste. -->
		<div class="mb-6 rounded-lg bg-red-500/10 p-4 ring-1 ring-red-500/30">
			<p class="text-xs font-semibold tracking-wide text-red-400 uppercase">Motif du refus</p>
			<p class="text-light-blue mt-1 text-sm">{item.refusedReason}</p>
		</div>
	{/if}

	<dl class="mb-8 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
		<div>
			<dt class="text-dark-light-blue/70 text-xs">Prix unitaire TTC</dt>
			<dd class="text-light-blue">{euro.format(item.unitPriceTtc)}</dd>
		</div>
		<div>
			<dt class="text-dark-light-blue/70 text-xs">Quantité</dt>
			<dd class="text-light-blue">{item.quantity}</dd>
		</div>
		<div>
			<dt class="text-dark-light-blue/70 text-xs">Total TTC</dt>
			<dd class="font-medium text-white">{euro.format(item.totalTtc)}</dd>
		</div>
		<div>
			<dt class="text-dark-light-blue/70 text-xs">Demandeur</dt>
			<dd class="text-light-blue">{item.requesterName}</dd>
		</div>
		<div>
			<dt class="text-dark-light-blue/70 text-xs">Marchand</dt>
			<dd class="text-light-blue">{item.domain ?? '—'}</dd>
		</div>
		{#if item.tags.length > 0}
			<div class="col-span-2 sm:col-span-3">
				<dt class="text-dark-light-blue/70 text-xs">Tags</dt>
				<dd class="mt-1 flex flex-wrap gap-1">
					{#each item.tags as tag (tag)}
						<span class="bg-dark-blue/60 text-light-blue rounded-full px-2 py-0.5 text-xs"
							>{tag}</span
						>
					{/each}
				</dd>
			</div>
		{/if}
		{#if item.link}
			<div class="col-span-2 sm:col-span-3">
				<dt class="text-dark-light-blue/70 text-xs">Lien</dt>
				<dd class="mt-1">
					<!-- Une URL marchande fait souvent plusieurs centaines de caractères : on
					     n'en montre que le bouton, l'adresse complète reste au survol. -->
					<Button
						href={item.link}
						rel="noreferrer noopener"
						size="sm"
						target="_blank"
						title={item.link}
						variant="secondary"
					>
						<ExternalLink class="size-4" />
						Ouvrir le lien
					</Button>
				</dd>
			</div>
		{/if}
		{#if item.note}
			<div class="col-span-2 sm:col-span-3">
				<dt class="text-dark-light-blue/70 text-xs">Note</dt>
				<dd class="text-light-blue whitespace-pre-line">{item.note}</dd>
			</div>
		{/if}
		{#if item.orderId !== null}
			<div class="col-span-2 sm:col-span-3">
				<dt class="text-dark-light-blue/70 text-xs">Commande</dt>
				<dd>
					<a
						class="text-sky-400 hover:underline"
						href={resolve('/orders/[id]', { id: String(item.orderId) })}
						>Commande n° {item.orderId}
					</a>
				</dd>
			</div>
		{/if}
	</dl>

	<!-- TRANS-NF-50 — « qui, quand » se lit ici et nulle part ailleurs : aucune
	     colonne d'attribution ne subsiste sur la table. -->
	<HistoryTimeline entries={data.history} />
</section>
