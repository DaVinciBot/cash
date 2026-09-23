<script lang="ts">
	import { Button, FilterChip } from '@davincibot/components';
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
		<Button href={resolve('/items/new')} size="md" variant="primary">Faire une commande</Button>
	</header>

	{#if form?.message}
		<p class="mb-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">
			{form.message}
		</p>
	{/if}

	<div class="mb-4 flex flex-wrap items-center gap-2">
		<FilterChip onclick={() => (stateFilter = 'all')} pressed={stateFilter === 'all'}>
			Tous ({counts.all})
		</FilterChip>
		{#each ITEM_STATES as state (state)}
			<FilterChip onclick={() => (stateFilter = state)} pressed={stateFilter === state}>
				{ITEM_STATE_BADGES[state].label} ({counts[state]})
			</FilterChip>
		{/each}
		<input
			class="border-rule-strong bg-dark-blue/60 placeholder:text-muted ml-auto w-56 rounded-xl border p-2.5 text-sm"
			placeholder="Rechercher…"
			type="search"
			bind:value={search}
		/>
	</div>

	{#if visible.length === 0}
		<p
			class="border-rule text-dark-light-blue/70 rounded-xl border border-dashed px-4 py-12 text-center"
		>
			{items.length === 0
				? "Vous n'avez encore demandé aucun composant."
				: 'Aucun item ne correspond à ce filtre.'}
		</p>
	{:else}
		<ul class="space-y-3">
			{#each visible as item (item.id)}
				<li class="border-rule bg-blue-gray/15 rounded-2xl border p-4 sm:p-5">
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
								<p class="mt-2 rounded bg-red-500/10 px-2 py-1 text-sm text-red-300">
									Motif du refus : {item.refusedReason}
								</p>
							{/if}
						</div>

						<div class="flex shrink-0 items-center gap-2">
							<!-- TRANS-NF-50 — le détail porte l'historique : qui a validé,
							     qui a refusé, quand. La liste, elle, reste une liste. -->
							<Button
								href={resolve('/items/[id]', { id: String(item.id) })}
								size="sm"
								variant="secondary"
							>
								Détail
							</Button>
							{#if isItemEditableByMember(item.state)}
								<Button
									href={resolve('/items/[id]/edit', { id: String(item.id) })}
									size="sm"
									variant="secondary"
								>
									Modifier
								</Button>
							{/if}
							{#if isItemDeletableByMember(item.state)}
								<form action="?/delete" method="POST" use:enhance>
									<input name="id" type="hidden" value={item.id} />
									<Button size="sm" type="submit" variant="danger">Supprimer</Button>
								</form>
							{/if}
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>
