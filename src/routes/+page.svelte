<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import CampusBadge from '$lib/components/cash/CampusBadge.svelte';
	import ItemStateBadge from '$lib/components/cash/ItemStateBadge.svelte';
	import {
		ITEM_STATE_BADGES,
		ITEM_STATES,
		isItemDeletableByMember,
		isItemEditableByMember,
		type ItemState
	} from '@davincibot/lib';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const items = $derived(data.items);

	let stateFilter = $state<ItemState | 'all'>('all');
	let search = $state('');

	const visible = $derived(
		items.filter((item) => {
			if (stateFilter !== 'all' && item.state !== stateFilter) {
				return false;
			}
			const needle = search.trim().toLowerCase();
			if (!needle) {
				return true;
			}
			return (
				item.name.toLowerCase().includes(needle) ||
				item.projectName.toLowerCase().includes(needle) ||
				(item.note ?? '').toLowerCase().includes(needle)
			);
		})
	);

	const counts = $derived(
		ITEM_STATES.reduce<Record<string, number>>(
			(acc, state) => {
				acc[state] = items.filter((i) => i.state === state).length;
				return acc;
			},
			{ all: items.length }
		)
	);

	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
</script>

<svelte:head><title>Mes items — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-6xl">
	<header class="mb-6 flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-white">Mes items</h1>
			<p class="text-dark-light-blue mt-1 text-sm">
				Chaque composant que vous demandez suit son propre cycle, de la revue du chef de projet
				jusqu'à la réception.
			</p>
		</div>
		<a
			class="bg-primary-600 hover:bg-primary-800 rounded-lg px-4 py-2 text-sm font-medium text-white"
			href={resolve('/items/new')}>Faire une commande</a
		>
	</header>

	{#if form?.message}
		<p
			class="mb-4 rounded-lg bg-rose-500/15 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/30"
		>
			{form.message}
		</p>
	{/if}

	<div class="mb-4 flex flex-wrap items-center gap-2">
		<button
			class="rounded-full px-3 py-1 text-xs font-medium {stateFilter === 'all'
				? 'bg-light-blue text-dark-blue'
				: 'bg-dark-blue/60 text-dark-light-blue hover:bg-blue-gray/25'}"
			onclick={() => (stateFilter = 'all')}
			type="button">Tous ({counts.all})</button
		>
		{#each ITEM_STATES as state (state)}
			<button
				class="rounded-full px-3 py-1 text-xs font-medium {stateFilter === state
					? 'bg-light-blue text-dark-blue'
					: 'bg-dark-blue/60 text-dark-light-blue hover:bg-blue-gray/25'}"
				onclick={() => (stateFilter = state)}
				type="button"
				>{ITEM_STATE_BADGES[state].emoji} {ITEM_STATE_BADGES[state].label} ({counts[state]})</button
			>
		{/each}
		<input
			class="border-light-blue/30 bg-dark-blue/60 placeholder-dark-light-blue/50 ml-auto w-56 rounded-lg border p-2 text-sm text-white"
			placeholder="Rechercher…"
			type="search"
			bind:value={search}
		/>
	</div>

	{#if visible.length === 0}
		<p
			class="border-light-blue/30 text-dark-light-blue rounded-lg border border-dashed px-4 py-12 text-center"
		>
			{items.length === 0
				? "Vous n'avez encore demandé aucun composant."
				: 'Aucun item ne correspond à ce filtre.'}
		</p>
	{:else}
		<ul class="space-y-3">
			{#each visible as item (item.id)}
				<li class="border-light-blue/20 bg-blue-gray/15 rounded-lg border p-4">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								{#if item.link}
									<!-- eslint-disable svelte/no-navigation-without-resolve -- URL marchande externe saisie par le membre, hors routes de l'app -->
									<a
										class="truncate font-medium text-white hover:underline"
										href={item.link}
										rel="noopener noreferrer"
										target="_blank">{item.name}</a
									>
									<!-- eslint-enable svelte/no-navigation-without-resolve -->
								{:else}
									<span class="truncate font-medium text-white">{item.name}</span>
								{/if}
								<ItemStateBadge state={item.state} />
								<CampusBadge campus={item.campus} />
							</div>
							<p class="text-dark-light-blue mt-1 text-sm">
								{item.projectName} · {item.quantity} × {euro.format(item.unitPriceTtc)} =
								<span class="text-light-blue font-medium">{euro.format(item.totalTtc)}</span>
								· demandé le {day.format(new Date(item.createdAt))}
							</p>
							{#if item.tags.length > 0}
								<p class="text-dark-light-blue/70 mt-1 text-xs">{item.tags.join(' · ')}</p>
							{/if}
							{#if item.note}
								<p class="bg-dark-blue/40 text-dark-light-blue mt-2 rounded px-2 py-1 text-sm">
									{item.note}
								</p>
							{/if}
							{#if item.refusedReason}
								<p class="mt-2 rounded bg-rose-500/10 px-2 py-1 text-sm text-rose-200">
									Motif du refus : {item.refusedReason}
								</p>
							{/if}
						</div>

						<div class="flex shrink-0 items-center gap-2">
							<!-- TRANS-NF-50 — le détail porte l'historique : qui a validé,
							     qui a refusé, quand. La liste, elle, reste une liste. -->
							<a
								class="border-light-blue/30 text-light-blue hover:bg-blue-gray/15 rounded-lg border px-3 py-1.5 text-sm"
								href={resolve('/items/[id]', { id: String(item.id) })}
							>
								Détail
							</a>
							{#if isItemEditableByMember(item.state)}
								<a
									class="border-light-blue/30 text-light-blue hover:bg-blue-gray/15 rounded-lg border px-3 py-1.5 text-sm"
									href={resolve('/items/[id]/edit', { id: String(item.id) })}
								>
									Modifier
								</a>
							{/if}
							{#if isItemDeletableByMember(item.state)}
								<form action="?/delete" method="POST" use:enhance>
									<input name="id" type="hidden" value={item.id} />
									<button
										class="rounded-lg border border-rose-500/40 px-3 py-1.5 text-sm text-rose-300 hover:bg-rose-500/10"
										type="submit">Supprimer</button
									>
								</form>
							{/if}
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>
