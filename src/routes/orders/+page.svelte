<script lang="ts">
	import { resolve } from '$app/paths';
	import CampusBadge from '$lib/components/cash/CampusBadge.svelte';
	import StateBadge from '$lib/components/cash/StateBadge.svelte';
	import { ORDER_STATE_BADGES, ORDER_STATES, type OrderState } from '@davincibot/lib';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const orders = $derived(data.orders);

	let stateFilter = $state<OrderState | 'all'>('all');

	const visible = $derived(
		stateFilter === 'all' ? orders : orders.filter((o) => o.state === stateFilter)
	);

	// CMD-F-81 — délimitation claire par année scolaire. L'ordre des groupes suit
	// celui de la liste, déjà triée par année décroissante puis par date métier.
	const years = $derived.by(() => {
		const groups: { id: number; label: string; orders: typeof visible }[] = [];
		for (const order of visible) {
			const group = groups.find((g) => g.id === order.schoolYearId);
			if (group) {
				group.orders.push(order);
			} else {
				groups.push({ id: order.schoolYearId, label: order.schoolYearLabel, orders: [order] });
			}
		}
		return groups;
	});

	const counts = $derived(
		ORDER_STATES.reduce<Record<string, number>>(
			(acc, state) => {
				acc[state] = orders.filter((o) => o.state === state).length;
				return acc;
			},
			{ all: orders.length }
		)
	);

	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
</script>

<svelte:head><title>Commandes — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-6xl">
	<header class="mb-6 flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-white">Commandes</h1>
			<p class="mt-1 text-sm text-gray-400">
				Triées par date de passation pour celles qui sont passées, par date de création pour les
				autres.
			</p>
		</div>
		<a
			class="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
			href={resolve('/bundle')}>Items à regrouper</a
		>
	</header>

	<div class="mb-4 flex flex-wrap items-center gap-2">
		<button
			class="rounded-full px-3 py-1 text-xs font-medium {stateFilter === 'all'
				? 'bg-white text-gray-900'
				: 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
			onclick={() => (stateFilter = 'all')}
			type="button">Toutes ({counts.all})</button
		>
		{#each ORDER_STATES as state (state)}
			<button
				class="rounded-full px-3 py-1 text-xs font-medium {stateFilter === state
					? 'bg-white text-gray-900'
					: 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
				onclick={() => (stateFilter = state)}
				type="button"
				>{ORDER_STATE_BADGES[state].emoji}
				{ORDER_STATE_BADGES[state].label} ({counts[state]})</button
			>
		{/each}
	</div>

	{#if visible.length === 0}
		<p class="rounded-lg border border-dashed border-gray-600 px-4 py-12 text-center text-gray-400">
			{orders.length === 0
				? 'Aucune commande. Constituez-en une depuis la file des items à regrouper.'
				: 'Aucune commande ne correspond à ce filtre.'}
		</p>
	{:else}
		{#each years as year (year.id)}
			<div class="mb-8">
				<h2
					class="mb-3 border-b border-gray-700 pb-1 text-sm font-semibold tracking-wide text-gray-300 uppercase"
				>
					Année scolaire {year.label}
				</h2>
				<ul class="space-y-2">
					{#each year.orders as order (order.id)}
						<li>
							<a
								class="block rounded-lg border border-gray-700 bg-gray-800 p-4 hover:border-gray-500"
								href={resolve('/orders/[id]', { id: String(order.id) })}
							>
								<div class="flex flex-wrap items-center gap-3">
									<span class="font-medium text-white">Commande #{order.id}</span>
									<StateBadge badge={ORDER_STATE_BADGES[order.state]} />
									{#if order.campus}
										<CampusBadge campus={order.campus} />
									{/if}
									<span class="ml-auto font-medium text-gray-200">
										{euro.format(order.amountTtc + order.shippingCostTtc)}
									</span>
								</div>
								<p class="mt-1 text-sm text-gray-400">
									{order.itemCount} item(s)
									{#if order.itemCount > 0 && order.state !== 'pending_treso'}
										· {order.receivedCount} / {order.itemCount} reçus
									{/if}
									{#if order.shippingCostTtc > 0}
										· port {euro.format(order.shippingCostTtc)}
									{/if}
									·
									{#if order.orderedAt}
										passée le {day.format(new Date(order.orderedAt))}
									{:else}
										créée le {day.format(new Date(order.createdAt))}
									{/if}
								</p>
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	{/if}
</section>
