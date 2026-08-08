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
			<p class="mt-1 text-sm text-gray-400">
				Chaque composant que vous demandez suit son propre cycle, de la revue du chef de projet
				jusqu'à la réception.
			</p>
		</div>
		<a
			class="bg-primary-600 hover:bg-primary-800 rounded-lg px-4 py-2 text-sm font-medium text-white"
			href={resolve('/items/new' as '/')}>Faire une commande</a
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
				? 'bg-white text-gray-900'
				: 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
			onclick={() => (stateFilter = 'all')}
			type="button">Tous ({counts.all})</button
		>
		{#each ITEM_STATES as state (state)}
			<button
				class="rounded-full px-3 py-1 text-xs font-medium {stateFilter === state
					? 'bg-white text-gray-900'
					: 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
				onclick={() => (stateFilter = state)}
				type="button"
				>{ITEM_STATE_BADGES[state].emoji} {ITEM_STATE_BADGES[state].label} ({counts[state]})</button
			>
		{/each}
		<input
			class="ml-auto w-56 rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white placeholder-gray-400"
			placeholder="Rechercher…"
			type="search"
			bind:value={search}
		/>
	</div>

	{#if visible.length === 0}
		<p class="rounded-lg border border-dashed border-gray-600 px-4 py-12 text-center text-gray-400">
			{items.length === 0
				? "Vous n'avez encore demandé aucun composant."
				: 'Aucun item ne correspond à ce filtre.'}
		</p>
	{:else}
		<ul class="space-y-3">
			{#each visible as item (item.id)}
				<li class="rounded-lg border border-gray-700 bg-gray-800 p-4">
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
							<p class="mt-1 text-sm text-gray-400">
								{item.projectName} · {item.quantity} × {euro.format(item.unitPriceTtc)} =
								<span class="font-medium text-gray-200">{euro.format(item.totalTtc)}</span>
								· demandé le {day.format(new Date(item.createdAt))}
							</p>
							{#if item.tags.length > 0}
								<p class="mt-1 text-xs text-gray-500">{item.tags.join(' · ')}</p>
							{/if}
							{#if item.note}
								<p class="mt-2 rounded bg-gray-700/50 px-2 py-1 text-sm text-gray-300">
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
							{#if isItemEditableByMember(item.state)}
								<a
									class="rounded-lg border border-gray-600 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700"
									href={resolve(`/items/${String(item.id)}/edit` as '/')}>Modifier</a
								>
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
