<script lang="ts">
	import { resolve } from '$app/paths';
	import CampusBadge from '$lib/components/cash/CampusBadge.svelte';
	import HistoryTimeline from '$lib/components/cash/HistoryTimeline.svelte';
	import ItemStateBadge from '$lib/components/cash/ItemStateBadge.svelte';
	import { isItemEditableByMember, isItemRefused } from '@davincibot/lib';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const item = $derived(data.item);

	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
	const moment = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
</script>

<svelte:head><title>{item.name} — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-3xl">
	<a class="text-sm text-gray-400 hover:text-gray-200" href={resolve('/')}>← Mes items</a>

	<header class="mt-3 mb-6 flex flex-wrap items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-white">{item.name}</h1>
			<div class="mt-2 flex flex-wrap items-center gap-2">
				<ItemStateBadge state={item.state} />
				<CampusBadge campus={item.campus} />
				<span class="text-sm text-gray-400">{item.projectName}</span>
			</div>
		</div>
		{#if item.isMine && isItemEditableByMember(item.state)}
			<a
				class="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
				href={resolve(`/items/${String(item.id)}/edit`)}>Modifier</a
			>
		{/if}
	</header>

	{#if isItemRefused(item.state) && item.refusedReason}
		<!-- CMD-F-29 — le motif est la seule chose que le membre lit pour
		     comprendre la décision : il passe avant le reste. -->
		<div class="mb-6 rounded-lg bg-rose-500/10 p-4 ring-1 ring-rose-500/30">
			<p class="text-xs font-semibold tracking-wide text-rose-300 uppercase">Motif du refus</p>
			<p class="mt-1 text-sm text-gray-200">{item.refusedReason}</p>
		</div>
	{/if}

	<dl class="mb-8 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
		<div>
			<dt class="text-xs text-gray-500">Prix unitaire TTC</dt>
			<dd class="text-gray-200">{euro.format(item.unitPriceTtc)}</dd>
		</div>
		<div>
			<dt class="text-xs text-gray-500">Quantité</dt>
			<dd class="text-gray-200">{item.quantity}</dd>
		</div>
		<div>
			<dt class="text-xs text-gray-500">Total TTC</dt>
			<dd class="font-medium text-white">{euro.format(item.totalTtc)}</dd>
		</div>
		<div>
			<dt class="text-xs text-gray-500">Demandeur</dt>
			<dd class="text-gray-200">{item.requesterName}</dd>
		</div>
		<div>
			<dt class="text-xs text-gray-500">Marchand</dt>
			<dd class="text-gray-200">{item.domain ?? '—'}</dd>
		</div>
		<div>
			<dt class="text-xs text-gray-500">Demandé le</dt>
			<dd class="text-gray-200">{moment.format(new Date(item.createdAt))}</dd>
		</div>
		{#if item.tags.length > 0}
			<div class="col-span-2 sm:col-span-3">
				<dt class="text-xs text-gray-500">Tags</dt>
				<dd class="mt-1 flex flex-wrap gap-1">
					{#each item.tags as tag (tag)}
						<span class="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-200">{tag}</span>
					{/each}
				</dd>
			</div>
		{/if}
		{#if item.link}
			<div class="col-span-2 sm:col-span-3">
				<dt class="text-xs text-gray-500">Lien</dt>
				<dd class="truncate">
					<!-- eslint-disable svelte/no-navigation-without-resolve -- URL marchande externe -->
					<a
						class="text-sky-400 hover:underline"
						href={item.link}
						rel="noreferrer noopener"
						target="_blank">{item.link}</a
					>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				</dd>
			</div>
		{/if}
		{#if item.note}
			<div class="col-span-2 sm:col-span-3">
				<dt class="text-xs text-gray-500">Note</dt>
				<dd class="whitespace-pre-line text-gray-200">{item.note}</dd>
			</div>
		{/if}
		{#if item.orderId !== null}
			<div class="col-span-2 sm:col-span-3">
				<dt class="text-xs text-gray-500">Commande</dt>
				<dd>
					<a class="text-sky-400 hover:underline" href={resolve(`/orders/${String(item.orderId)}`)}
						>Commande n° {item.orderId}</a
					>
				</dd>
			</div>
		{/if}
	</dl>

	<!-- TRANS-NF-50 — « qui, quand » se lit ici et nulle part ailleurs : aucune
	     colonne d'attribution ne subsiste sur la table. -->
	<HistoryTimeline entries={data.history} />
</section>
